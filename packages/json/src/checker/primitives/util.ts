import { ErrorReporter, Range } from '@spyglassmc/core'
import type { JsonExpectation, JsonNode } from '../../node'
import type { JsonChecker, JsonCheckerContext } from '../JsonChecker'

export function ref(checker: () => JsonChecker): JsonChecker {
	return (node: JsonNode, ctx: JsonCheckerContext) => {
		return checker()(node, ctx)
	}
}

export function as(context: string, checker: JsonChecker): JsonChecker {
	return async (node: JsonNode, ctx: JsonCheckerContext) => {
		checker(node, { ...ctx, context })
	}
}

export type AttemptResult = {
	totalErrorRange: number,
	expectation?: JsonExpectation[],
	updateCtx: () => void,
}

export function attempt(checker: JsonChecker, node: JsonNode, ctx: JsonCheckerContext): AttemptResult {
	// TODO: determine whether cloning of AST is necessary
	// Currently nodes are not cloned
	const tempCtx = { ...ctx, err: new ErrorReporter() }

	checker(node, { ...tempCtx, context: ctx.context })

	const totalErrorRange = tempCtx.err.errors
		.map(e => e.range.end - e.range.start)
		.reduce((a, b) => a + b, 0)

	return {
		totalErrorRange,
		expectation: node.expectation,
		updateCtx: () => {
			ctx.err.absorb(tempCtx.err)
		},
	}
}

export function any(checkers: JsonChecker[]): JsonChecker {
	if (checkers.length === 0) {
		throw new Error('Expected at least one checker')
	}
	return async (node: JsonNode, ctx: JsonCheckerContext) => {
		const attempts = checkers
			.map(Checker => attempt(Checker, node, ctx))
			.sort((a, b) => a.totalErrorRange - b.totalErrorRange)
		attempts[0].updateCtx()
		node.expectation = attempts.filter(a => a.expectation).flatMap(a => a.expectation!)
	}
}

export function expectation(checker: JsonChecker, ctx: JsonCheckerContext): JsonExpectation[] | undefined {
	const node: JsonNode = { type: 'json:null', range: Range.create(0) }
	const tempCtx: JsonCheckerContext = {
		...ctx,
		err: new ErrorReporter(),
		depth: (ctx.depth ?? 0) + 1,
	}
	checker(node, tempCtx)
	return node.expectation
}
