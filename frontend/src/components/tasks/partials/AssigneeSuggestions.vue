<template>
	<ul
		:id="id"
		class="assignee-suggestions"
		role="listbox"
	>
		<li
			v-for="(user, index) in users"
			:id="`${id}-${index}`"
			:key="user.id"
			class="assignee-suggestion"
			:class="{'is-selected': index === selectedIndex}"
			role="option"
			:aria-selected="index === selectedIndex"
			@mousedown.prevent="emit('select', index)"
		>
			<UserAvatar
				:user="user"
				:size="28"
				class="assignee-avatar"
			/>
			<span class="assignee-info">
				<span class="assignee-name">{{ getDisplayName(user) }}</span>
				<span
					v-if="user.name"
					class="assignee-username"
				>@{{ user.username }}</span>
			</span>
		</li>
		<li
			v-if="users.length === 0"
			class="assignee-suggestion no-results"
		>
			{{ $t('task.mention.noUsersFound') }}
		</li>
	</ul>
</template>

<script setup lang="ts">
import type {User} from '@/client/generated'
import UserAvatar from '@/components/misc/UserAvatar.vue'
import {getDisplayName} from '@/helpers/user'

defineProps<{
	id: string,
	users: User[],
	selectedIndex: number,
}>()

const emit = defineEmits<{
	select: [index: number],
}>()
</script>

<style lang="scss" scoped>
.assignee-suggestions {
	position: absolute;
	inset-block-start: calc(100% + .25rem);
	inset-inline-start: 0;
	z-index: 10;
	min-inline-size: 240px;
	max-block-size: 300px;
	overflow-y: auto;
	margin: 0;
	padding: .25rem;
	list-style: none;
	background: var(--white);
	color: var(--grey-900);
	border-radius: $radius;
	box-shadow: var(--shadow-md);
	font-size: .9rem;
}

.assignee-suggestion {
	display: flex;
	align-items: center;
	gap: .6rem;
	padding: .4rem .6rem;
	border-radius: $radius;
	cursor: pointer;
	transition: background-color $transition;

	&.is-selected,
	&:hover {
		background: var(--grey-100);
	}

	&.no-results {
		color: var(--grey-500);
		cursor: default;
	}
}

.assignee-avatar {
	flex-shrink: 0;
	border-radius: 50%;
}

.assignee-info {
	display: flex;
	flex-direction: column;
	min-inline-size: 0;

	span {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
}

.assignee-name {
	color: var(--grey-800);
	font-weight: 500;
}

.assignee-username {
	font-size: .75rem;
	color: var(--grey-500);
}
</style>
