import ArgumentNode from './ArgumentNode'
import LocalCache, { combineLocalCache } from './LocalCache'
import ParsingError from './ParsingError'
import { CompletionItem } from 'vscode-languageserver'

/**
 * Represent a parsed line in a function.
 */
export default interface Line {
    /**
     * All parsed arguments of the line.
     */
    args: ArgumentNode[]
    /**
     * All cache of the line.
     */
    cache?: LocalCache
    /**
     * All errors occured while parsing the line.
     */
    errors?: ParsingError[]
    /**
     * All completions in this line.
     */
    completions?: CompletionItem[]
}

export function combineLine(base: Line, override: Line) {
    // Args.
    const ans: Line = {
        args: [...base.args, ...override.args]
    }
    // Cache.
    if (base.cache || override.cache) {
        ans.cache = combineLocalCache(base.cache, override.cache)
    }
    // Completions.
    if (override.completions && override.completions.length !== 0) {
        ans.completions = override.completions
    } else if (base.completions && base.completions.length !== 0) {
        ans.completions = base.completions
    }
    // Errors.
    if ((base.errors && base.errors.length !== 0) || (override.errors && override.errors.length !== 0)) {
        /* istanbul ignore next */
        ans.errors = [...base.errors ? base.errors : [], ...override.errors ? override.errors : []]
    }
    return ans
}
