import type { ColorTokenType } from '@spyglassmc/core'
import { ColorToken, traverseLeaves } from '@spyglassmc/core'
import type { JsonNode } from '../node'
import { JsonPropertyNode } from '../node'

export function entry(root: JsonNode): readonly ColorToken[] {
	const ans: ColorToken[] = []
	traverseLeaves(root, (astNode, [parent]) => {
		const node = (astNode as JsonNode)
		let type: ColorTokenType | undefined
		switch(node.type) {
			case 'json:number':
				type = 'number'
				break
			case 'json:boolean':
				type = 'modifier'
				break
			case 'json:string':
				if (JsonPropertyNode.is(parent) && node.range.start === parent.key.range.start) {
					type = 'property'
				} else if (node.expectation?.find(e => e.type === 'json:string' && e.resource)) {
					type = 'resourceLocation'
				} else {
					type = 'string'
				}
		}
		if (type !== undefined) {
			ans.push(ColorToken.create(node, type))
		}
	})
	return Object.freeze(ans)
}
