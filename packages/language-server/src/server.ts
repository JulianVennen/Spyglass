import * as core from '@spyglassmc/core'
import * as je from '@spyglassmc/java-edition'
import * as locales from '@spyglassmc/locales'
import * as nbtdoc from '@spyglassmc/nbtdoc'
import envPaths from 'env-paths'
import * as util from 'util'
import * as ls from 'vscode-languageserver/node'
import type { CustomInitializationOptions, CustomServerCapabilities, MyLspDataHackPubifyRequestParams, MyLspInlayHint, MyLspInlayHintRequestParams } from './util'
import { toCore, toLS } from './util'

export * from './util/types'

if (process.argv.length === 2) {
	// When the server is launched from the cmd script, the process arguments
	// are wiped. I don't know why it happens, but this is what it is.
	// Therefore, we push a '--stdio' if the argument list is too short.
	process.argv.push('--stdio')
}

const { cache: cacheRoot } = envPaths('spyglassmc')

const connection = ls.createConnection()
let capabilities!: ls.ClientCapabilities
let workspaceFolders!: ls.WorkspaceFolder[]
let hasShutdown = false
let progressReporter: ls.WorkDoneProgressReporter | undefined

const logger: core.Logger = {
	error: (msg: any, ...args: any[]): void => connection.console.error(util.format(msg, ...args)),
	info: (msg: any, ...args: any[]): void => connection.console.info(util.format(msg, ...args)),
	log: (msg: any, ...args: any[]): void => connection.console.log(util.format(msg, ...args)),
	warn: (msg: any, ...args: any[]): void => connection.console.warn(util.format(msg, ...args)),
}
let service!: core.Service

connection.onInitialize(async params => {
	const initializationOptions = params.initializationOptions as CustomInitializationOptions | undefined

	logger.info(`[onInitialize] processId = ${JSON.stringify(params.processId)}`)
	logger.info(`[onInitialize] clientInfo = ${JSON.stringify(params.clientInfo)}`)
	logger.info(`[onInitialize] initializationOptions = ${JSON.stringify(initializationOptions)}`)

	capabilities = params.capabilities
	workspaceFolders = params.workspaceFolders ?? []

	if (initializationOptions?.inDevelopmentMode) {
		await new Promise(resolve => setTimeout(resolve, 3000))
		logger.warn('Delayed 3 seconds manually. If you see this in production, it means SPGoding messed up.')
	}

	if (params.workDoneToken) {
		progressReporter = connection.window.attachWorkDoneProgress(params.workDoneToken)
		progressReporter.begin(locales.localize('server.progress.preparing.title'))
	}

	try {
		await locales.loadLocale(params.locale)
	} catch (e) {
		logger.error('[loadLocale]', e)
	}

	try {
		service = new core.Service({
			cacheRoot,
			initializers: [
				nbtdoc.initialize,
				je.initialize,
			],
			isDebugging: false,
			logger,
			profilers: new core.ProfilerFactory(logger, [
				'cache#load',
				'cache#save',
				'project#init',
				'project#ready',
			]),
			projectPath: core.fileUtil.fileUriToPath(workspaceFolders[0].uri),
		})
		service.project
			.on('documentErrorred', ({ doc, errors }) => {
				connection.sendDiagnostics({
					diagnostics: toLS.diagnostics(errors, doc),
					uri: doc.uri,
					version: doc.version,
				})
			})
			.on('documentRemoved', ({ uri }) => {
				connection.sendDiagnostics({ uri, diagnostics: [] })
			})
			.on('ready', () => {
				progressReporter?.done()
			})
		await service.project.init()
	} catch (e) {
		logger.error('[new Service]', e)
	}

	const customCapabilities: CustomServerCapabilities = {
		dataHackPubify: true,
		inlayHints: true,
		resetProjectCache: true,
		showCacheRoot: true,
	}

	const ans: ls.InitializeResult = {
		serverInfo: {
			name: 'Spyglass Language Server',
		},
		capabilities: {
			colorProvider: {},
			completionProvider: {
				triggerCharacters: service.project.meta.getTriggerCharacters(),
			},
			declarationProvider: {},
			definitionProvider: {},
			implementationProvider: {},
			documentFormattingProvider: {},
			referencesProvider: {},
			typeDefinitionProvider: {},
			documentHighlightProvider: {},
			documentSymbolProvider: {
				label: 'Spyglass',
			},
			hoverProvider: {},
			semanticTokensProvider: {
				documentSelector: toLS.documentSelector(service.project.meta),
				legend: toLS.semanticTokensLegend(),
				full: { delta: false },
				range: true,
			},
			signatureHelpProvider: {
				triggerCharacters: [' '],
			},
			textDocumentSync: {
				change: ls.TextDocumentSyncKind.Incremental,
				openClose: true,
			},
			workspaceSymbolProvider: {},
			experimental: {
				spyglassmc: customCapabilities,
			},
		},
	}

	if (capabilities.workspace?.workspaceFolders) {
		ans.capabilities.workspace = {
			workspaceFolders: {
				supported: true,
				changeNotifications: true,
			},
		}
	}

	return ans
})

connection.onInitialized(async () => {
	await service.project.ready()
	if (capabilities.workspace?.workspaceFolders) {
		connection.workspace.onDidChangeWorkspaceFolders(async () => {
			// FIXME
			// service.rawRoots = (await connection.workspace.getWorkspaceFolders() ?? []).map(r => r.uri)
		})
	}
})

connection.onDidOpenTextDocument(({ textDocument: { text, uri, version, languageId: languageID } }) => {
	service.project.onDidOpen(uri, languageID, version, text)
})
connection.onDidChangeTextDocument(({ contentChanges, textDocument: { uri, version } }) => {
	service.project.onDidChange(uri, contentChanges, version)
})
connection.onDidCloseTextDocument(({ textDocument: { uri } }) => {
	service.project.onDidClose(uri)
})

connection.workspace.onDidRenameFiles(({ }) => {
})

connection.onColorPresentation(async ({ textDocument: { uri }, color, range }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const presentation = service.getColorPresentation(node, doc, toCore.range(range, doc), toCore.color(color))
	return toLS.colorPresentationArray(presentation, doc)
})
connection.onDocumentColor(async ({ textDocument: { uri } }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const info = service.getColorInfo(node, doc)
	return toLS.colorInformationArray(info, doc)
})

connection.onCompletion(async ({ textDocument: { uri }, position, context }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const offset = toCore.offset(position, doc)
	const items = service.complete(node, doc, offset, context?.triggerCharacter)
	return items.map(item => toLS.completionItem(item, doc, offset, capabilities.textDocument?.completion?.completionItem?.insertReplaceSupport))
})

connection.onRequest('spyglassmc/dataHackPubify', ({ initialism }: MyLspDataHackPubifyRequestParams) => {
	return service.dataHackPubify(initialism)
})

connection.onDeclaration(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['declaration', 'definition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.declaration?.linkSupport)
})
connection.onDefinition(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['definition', 'declaration', 'implementation', 'typeDefinition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.definition?.linkSupport)
})
connection.onImplementation(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['implementation', 'definition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.implementation?.linkSupport)
})
connection.onReferences(async ({ textDocument: { uri }, position, context: { includeDeclaration } }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), includeDeclaration ? undefined : ['reference'])
	return toLS.locationLink(ans, doc, false)
})
connection.onTypeDefinition(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), ['typeDefinition'])
	return toLS.locationLink(ans, doc, capabilities.textDocument?.typeDefinition?.linkSupport)
})

connection.onDocumentHighlight(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getSymbolLocations(node, doc, toCore.offset(position, doc), undefined, true)
	return toLS.documentHighlight(ans)
})

connection.onDocumentSymbol(async ({ textDocument: { uri } }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	return toLS.documentSymbolsFromTables(
		[service.project.symbols.global, ...core.AstNode.getLocalsToLeaves(node)],
		doc,
		capabilities.textDocument?.documentSymbol?.hierarchicalDocumentSymbolSupport,
		capabilities.textDocument?.documentSymbol?.symbolKind?.valueSet
	)
})

connection.onHover(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const ans = service.getHover(node, doc, toCore.offset(position, doc))
	return ans ? toLS.hover(ans, doc) : undefined
})

connection.onRequest('spyglassmc/inlayHints', async ({ textDocument: { uri }, range }: MyLspInlayHintRequestParams): Promise<MyLspInlayHint[]> => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return []
	}
	const { doc, node } = docAndNode
	const hints = service.getInlayHints(node, doc, toCore.range(range, doc))
	return toLS.inlayHints(hints, doc)
})

connection.onRequest('spyglassmc/resetProjectCache', async (): Promise<void> => {
	service.project.resetCache()
	return service.project.restart()
})

connection.onRequest('spyglassmc/showCacheRoot', async (): Promise<void> => {
	return service.project.showCacheRoot()
})

connection.languages.semanticTokens.on(async ({ textDocument: { uri } }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return { data: [] }
	}
	const { doc, node } = docAndNode
	const tokens = service.colorize(node, doc)
	return toLS.semanticTokens(tokens, doc)
})
connection.languages.semanticTokens.onRange(async ({ textDocument: { uri }, range }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return { data: [] }
	}
	const { doc, node } = docAndNode
	const tokens = service.colorize(node, doc, toCore.range(range, doc))
	return toLS.semanticTokens(tokens, doc)
})

connection.onSignatureHelp(async ({ textDocument: { uri }, position }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	const help = service.getSignatureHelp(node, doc, toCore.offset(position, doc))
	return toLS.signatureHelp(help)
})

connection.onWorkspaceSymbol(({ query }) => {
	return toLS.symbolInformationArrayFromTable(
		service.project.symbols.global, query,
		capabilities.textDocument?.documentSymbol?.symbolKind?.valueSet
	)
})

connection.onDocumentFormatting(async ({ textDocument: { uri }, options }) => {
	const docAndNode = await service.project.ensureParsedAndCheckedOnlyWhenReady(uri)
	if (!docAndNode) {
		return undefined
	}
	const { doc, node } = docAndNode
	let text = service.format(node, doc, options.tabSize, options.insertSpaces)
	if (options.insertFinalNewline && text.charAt(text.length - 1) !== '\n') {
		text += '\n'
	}
	return [toLS.textEdit(node.range, text, doc)]
})

connection.onShutdown(async (): Promise<void> => {
	await service.project.close()
	hasShutdown = true
})
connection.onExit((): void => {
	connection.dispose()
	if (!hasShutdown) {
		console.error('The server has not finished the shutdown request before receiving the exit request.')
		process.exitCode = 1
	}
})

connection.listen()
