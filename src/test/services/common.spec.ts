import assert = require('power-assert')
import { describe, it } from 'mocha'
import { TextDocument } from 'vscode-languageserver-textdocument'
import { URI as Uri } from 'vscode-uri'
import { NodeRange } from '../../nodes'
import { IdentityNode } from '../../nodes/IdentityNode'
import { getId, getRel, getRootUri, getUri, getUriFromId, parseFunctionNodes } from '../../services/common'
import { VanillaConfig } from '../../types/Config'
import { UrisOfIds, UrisOfStrings } from '../../types/handlers'
import { LineNode } from '../../types/LineNode'
import { DatapackLanguageService } from '../../services/DatapackLanguageService'

describe('common.ts Tests', () => {
    describe('getRootUri() Tests', () => {
        it('Should append slash', () => {
            const uris = new Map()

            const uri = getRootUri('file:///c:/foo')

            assert.deepStrictEqual(uri, Uri.parse('file:///c:/foo/'))
        })
        it('Should not append slash when already exists', () => {
            const uris = new Map()

            const uri = getRootUri('file:///c:/foo/')

            assert.deepStrictEqual(uri, Uri.parse('file:///c:/foo/'))
        })
    })
    describe('parseFunctionNodes() Tests', () => {
        const service = new DatapackLanguageService()
        const roots: Uri[] = []
        const uri = Uri.parse('file:///c:/foo')
        it('Should push an empty node at the end of whitespaces', async () => {
            const content = '  \t  '
            const document = TextDocument.create('', '', 0, content)
            const nodes: LineNode[] = []
            const config = VanillaConfig
            const cacheFile = { cache: {}, advancements: {}, tags: { functions: {} }, files: {}, version: NaN }

            parseFunctionNodes(service, document, 0, 5, nodes, config, cacheFile, uri, roots)

            assert.deepStrictEqual(nodes, [{
                [NodeRange]: { start: 0, end: 5 },
                args: [], tokens: [], hint: { fix: [], options: [] }
            }])
        })
        it('Should push a parsed node for other input', async () => {
            const content = '# test'
            const document = TextDocument.create('', '', 0, content)
            const nodes: LineNode[] = []
            const config = VanillaConfig
            const cacheFile = { cache: {}, advancements: {}, tags: { functions: {} }, files: {}, version: NaN }

            parseFunctionNodes(service, document, 0, 6, nodes, config, cacheFile, uri, roots)

            assert.deepStrictEqual(nodes, [{
                [NodeRange]: { start: 0, end: 6 },
                args: [{ data: '# test', parser: 'string' }],
                tokens: [],
                hint: { fix: [], options: [] }, completions: undefined
            }])
        })
    })
    describe('getRel() Tests', () => {
        it('Should return the relative path of a URI', () => {
            const uri = Uri.parse('file:///c:/bar/data/minecraft/functions/test.mcfunction')
            const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]

            const actual = getRel(uri, roots) as string

            assert(actual.match(/^data[\/\\]minecraft[\/\\]functions[\/\\]test\.mcfunction$/))
        })
        it('Should return undefined', () => {
            const uri = Uri.parse('file:///c:/qux/data/minecraft/functions/test.mcfunction')
            const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]

            const actual = getRel(uri, roots)

            assert(actual === undefined)
        })
    })
    describe('getId() Tests', () => {
        it('Should return the ID', () => {
            const uri = Uri.parse('file:///c:/bar/data/minecraft/functions/test.mcfunction')
            const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]

            const actual = getId(uri, roots)?.toString()

            assert(actual === 'minecraft:test')
        })
    })
    describe('getUriFromId() Tests', () => {
        const pathExists = async () => false
        const roots = [Uri.parse('file:///c:/foo/'), Uri.parse('file:///c:/bar/')]
        it('Should return cached value', async () => {
            const uri = Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction')
            const urisOfIds: UrisOfIds = new Map([
                ['function|spgoding:foo', uri]
            ])
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert(uri === actual)
        })
        it('Should return null when cannot resolve', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert(actual === null)
        })
        it('Should return the uri if the file can be found in root[0]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])
            const pathExists = async (abs: string) => {
                return !!abs.match(/^c:[\\\/]foo[\\\/]data[\\\/]spgoding[\\\/]functions[\\\/]foo\.mcfunction$/i)
            }

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri if the file can be found in root[1]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])
            const pathExists = async (abs: string) => {
                return !!abs.match(/^c:[\\\/]bar[\\\/]data[\\\/]spgoding[\\\/]functions[\\\/]foo\.mcfunction$/i)
            }

            const actual = await getUriFromId(pathExists, roots, urisOfIds, id, 'function')

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/bar/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri under the preferred root[0]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = getUriFromId(pathExists, roots, urisOfIds, id, 'function', roots[0])

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/foo/data/spgoding/functions/foo.mcfunction'))
        })
        it('Should return the uri under the preferred root[1]', async () => {
            const urisOfIds: UrisOfIds = new Map()
            const id = new IdentityNode('spgoding', ['foo'])

            const actual = getUriFromId(pathExists, roots, urisOfIds, id, 'function', roots[1])

            assert.deepStrictEqual(actual, Uri.parse('file:///c:/bar/data/spgoding/functions/foo.mcfunction'))
        })
    })
})
