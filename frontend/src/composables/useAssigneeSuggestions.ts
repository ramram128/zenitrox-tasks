import {ref, toValue, watch, type MaybeRefOrGetter, type Ref} from 'vue'
import {useDebounceFn} from '@vueuse/core'

import type {User} from '@/client/generated'
import {searchProjectUsers} from '@/client/queries/userSearch'

export type PrefixToken = {
	// Index of the prefix character in the text.
	start: number
	query: string
}

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Finds the assignee token the caret is currently in, e.g. "@ra" in
 * "Fix bug @ra|". The prefix must start the text or follow whitespace so
 * email addresses in a title don't open the suggestions.
 */
export function findPrefixToken(text: string, caret: number, prefix: string): PrefixToken | null {
	const beforeCaret = text.slice(0, caret)
	const match = new RegExp(`(^|\\s)${escapeRegExp(prefix)}([^\\s'"]*)$`).exec(beforeCaret)
	if (match === null) {
		return null
	}
	const query = match[2] ?? ''
	return {start: caret - query.length - prefix.length, query}
}

/**
 * Shows the users of a project while typing the quick add magic assignee
 * prefix in a textarea, and inserts the picked username.
 */
export function useAssigneeSuggestions(
	textarea: Ref<HTMLTextAreaElement | null>,
	text: Ref<string>,
	projectId: MaybeRefOrGetter<number>,
	prefix: MaybeRefOrGetter<string | undefined>,
) {
	const isOpen = ref(false)
	const users = ref<User[]>([])
	const selectedIndex = ref(0)
	let token: PrefixToken | null = null
	let requestId = 0

	function close() {
		isOpen.value = false
		users.value = []
		token = null
		requestId++
	}

	const search = useDebounceFn(async (project: number, query: string) => {
		const id = ++requestId
		const found = await searchProjectUsers(project, query)
		// Drop answers to searches the user has already typed past.
		if (id !== requestId) {
			return
		}
		users.value = found.filter(user => user.username)
		selectedIndex.value = 0
		isOpen.value = true
	}, 150)

	function update() {
		const el = textarea.value
		const currentPrefix = toValue(prefix)
		const project = toValue(projectId)
		if (!el || !currentPrefix || !project || el.selectionStart !== el.selectionEnd) {
			close()
			return
		}
		token = findPrefixToken(text.value, el.selectionStart, currentPrefix)
		if (token === null) {
			close()
			return
		}
		search(project, token.query)
	}

	function select(index = selectedIndex.value) {
		const user = users.value[index]
		const el = textarea.value
		const currentPrefix = toValue(prefix)
		if (!user?.username || !el || token === null || !currentPrefix) {
			return
		}
		const before = text.value.slice(0, token.start)
		const after = text.value.slice(el.selectionStart).replace(/^\S*/, '').replace(/^ /, '')
		const inserted = `${currentPrefix}${user.username} `
		text.value = before + inserted + after
		close()

		const caret = before.length + inserted.length
		requestAnimationFrame(() => {
			el.focus()
			el.setSelectionRange(caret, caret)
		})
	}

	/**
	 * Handles navigation keys while the list is open. Returns true when the
	 * key was used, so the caller skips its own handling (e.g. Enter to save).
	 */
	function handleKeydown(e: KeyboardEvent): boolean {
		if (!isOpen.value || e.isComposing) {
			return false
		}
		const count = users.value.length
		switch (e.key) {
			case 'ArrowDown':
				if (count) selectedIndex.value = (selectedIndex.value + 1) % count
				break
			case 'ArrowUp':
				if (count) selectedIndex.value = (selectedIndex.value - 1 + count) % count
				break
			case 'Enter':
			case 'Tab':
				if (!count) return false
				select()
				break
			case 'Escape':
				close()
				break
			default:
				return false
		}
		e.preventDefault()
		return true
	}

	watch(() => toValue(projectId), close)

	return {isOpen, users, selectedIndex, update, select, close, handleKeydown}
}
