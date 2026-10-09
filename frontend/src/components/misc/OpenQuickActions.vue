<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue'
import {useBaseStore} from '@/stores/base'
import {onBeforeUnmount, onMounted} from 'vue'
import {eventToShortcutString} from '@/helpers/shortcut'
import {isAppleDevice} from '@/helpers/isAppleDevice'

const baseStore = useBaseStore()

// See https://github.com/github/hotkey/discussions/85#discussioncomment-5214660
function openQuickActionsViaHotkey(event: KeyboardEvent) {
	const shortcutString = eventToShortcutString(event)
	if (!shortcutString) return

	// On macOS, use Cmd+K (Meta+K), on other platforms use Ctrl+K (Control+K)
	const expectedShortcut = isAppleDevice() ? 'Meta+KeyK' : 'Control+KeyK'
	if (shortcutString !== expectedShortcut) return
	
	event.preventDefault()

	openQuickActions()
}

onMounted(() => {
	document.addEventListener('keydown', openQuickActionsViaHotkey)
})

onBeforeUnmount(() => {
	document.removeEventListener('keydown', openQuickActionsViaHotkey)
})

function openQuickActions() {
	baseStore.setQuickActionsActive(true)
}

const shortcutHint = isAppleDevice() ? '⌘K' : 'Ctrl K'
</script>

<template>
	<BaseButton
		class="trigger-button search-trigger"
		:title="$t('keyboardShortcuts.quickSearch')"
		@click="openQuickActions"
	>
		<Icon icon="search" />
		<span class="search-placeholder">{{ $t('quickActions.placeholder') }}</span>
		<kbd class="search-shortcut">{{ shortcutHint }}</kbd>
	</BaseButton>
</template>

<style lang="scss" scoped>
.search-trigger {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: .625rem;

	@media screen and (min-width: $tablet) {
		align-self: center;
		justify-content: flex-start;
		inline-size: clamp(14rem, 28vw, 26rem);
		block-size: 2.5rem;
		padding-inline: .875rem .5rem;
		border-radius: $radius;
		background: var(--white);
		border: 1px solid var(--grey-200);
		font-size: .875rem !important;
		transition: border-color $transition, box-shadow $transition;

		&:hover {
			border-color: var(--grey-300);
			box-shadow: var(--shadow-xs);
		}
	}
}

.search-placeholder,
.search-shortcut {
	display: none;

	@media screen and (min-width: $tablet) {
		display: inline;
	}
}

.search-placeholder {
	flex: 1;
	text-align: start;
	color: var(--text-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.search-shortcut {
	font-family: inherit;
	font-size: .6875rem;
	font-weight: 600;
	padding: .125rem .375rem;
	border-radius: $radius-small;
	background: var(--grey-100);
	color: var(--text-muted);
}
</style>
