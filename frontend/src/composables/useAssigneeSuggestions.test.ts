import {describe, expect, it} from 'vitest'

import {findPrefixToken} from './useAssigneeSuggestions'

describe('findPrefixToken', () => {
	it('finds a bare prefix at the start', () => {
		expect(findPrefixToken('@', 1, '@')).toEqual({start: 0, query: ''})
	})

	it('finds a partial username after a space', () => {
		const text = 'Fix bug @ra'
		expect(findPrefixToken(text, text.length, '@')).toEqual({start: 8, query: 'ra'})
	})

	it('only looks at the text before the caret', () => {
		expect(findPrefixToken('Fix @ra tomorrow', 7, '@')).toEqual({start: 4, query: 'ra'})
		expect(findPrefixToken('Fix @ra tomorrow', 16, '@')).toBeNull()
	})

	it('ignores the prefix inside a word like an email address', () => {
		const text = 'Mail ram@example.com'
		expect(findPrefixToken(text, text.length, '@')).toBeNull()
	})

	it('supports other prefixes such as the Todoist mode', () => {
		const text = 'Call +ar'
		expect(findPrefixToken(text, text.length, '+')).toEqual({start: 5, query: 'ar'})
	})
})
