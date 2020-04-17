import ArgumentParser from './ArgumentParser'
import ParsingContext from '../types/ParsingContext'
import StringReader from '../utils/StringReader'
import TextComponentNode from '../types/nodes/TextComponent'
import { ArgumentParserResult } from '../types/Parser'
import schema from 'datapack-json/src/shared/text_component.json'
import { getLanguageService, JSONSchema, TextDocument } from 'vscode-json-languageservice'
import { SynchronousPromise } from 'synchronous-promise'
import ParsingError from '../types/ParsingError'
import { remapCompletionItem } from '../utils/utils'
import { NodeRange } from '../types/nodes/ArgumentNode'

class TextComponentArgumentParser extends ArgumentParser<TextComponentNode> {
    static identity = 'TextComponent'
    readonly identity = 'textComponent'

    /* istanbul ignore next */
    static readonly Service = getLanguageService({
        contributions: [],
        promiseConstructor: SynchronousPromise
    })

    /* istanbul ignore next */
    static initialize() {
        TextComponentArgumentParser.Service.configure({
            validate: true, allowComments: false,
            schemas: [{ uri: schema['$id'], fileMatch: ['*.json'], schema: schema as any }]
        })
    }

    /* istanbul ignore next */
    parse(reader: StringReader, ctx: ParsingContext): ArgumentParserResult<TextComponentNode> {
        const start = reader.cursor
        const ans: ArgumentParserResult<TextComponentNode> = {
            data: new TextComponentNode(reader.readRemaining()),
            tokens: [], errors: [], cache: {}, completions: []
        }

        const text = ' '.repeat(reader.cursor) + reader.readRemaining()
        const document = TextDocument.create('dhp://text_component.json', 'json', 0, text)
        const jsonDocument = TextComponentArgumentParser.Service.parseJSONDocument(document)

        //#region Data.
        ans.data.document = document
        ans.data.jsonDocument = jsonDocument
        ans.data[NodeRange] = { start, end: reader.cursor }
        //#endregion

        //#region Errors.
        TextComponentArgumentParser.Service.doValidation(document, jsonDocument, undefined).then(diagnostics => {
            for (const diag of diagnostics) {
                ans.errors.push(new ParsingError(
                    { start: diag.range.start.character, end: diag.range.end.character },
                    diag.message.endsWith('.') ? diag.message.slice(0, -1) : diag.message,
                    undefined,
                    diag.severity
                ))
            }
        })
        //#endregion

        //#region Completions.
        TextComponentArgumentParser.Service.doComplete(document, { line: 0, character: ctx.cursor }, jsonDocument).then(completions => {
            if (completions) {
                ans.completions.push(...completions.items.map(v => remapCompletionItem(v, ctx.lineNumber)))
            }
        })
        //#endregion

        return ans
    }

    /* istanbul ignore next */
    getExamples(): string[] {
        return ['"hello world"', '""', '{"text":"hello world"}', '[""]']
    }
}

module TextComponentArgumentParser {
    /* istanbul ignore next */
    TextComponentArgumentParser.initialize()
}

export default TextComponentArgumentParser 
