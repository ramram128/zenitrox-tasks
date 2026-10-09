<template>
	<section class="overview-side-card">
		<header class="overview-side-card__header">
			<h2>{{ $t('home.team.title') }}</h2>
			<RouterLink
				:to="{name: 'dashboard'}"
				class="overview-side-card__link"
			>
				{{ $t('home.team.viewDashboard') }}
			</RouterLink>
		</header>

		<dl class="team-stats">
			<div>
				<dt>{{ $t('dashboard.open') }}</dt>
				<dd>{{ openTasks.length }}</dd>
			</div>
			<div :class="{'is-danger': overdueCount > 0}">
				<dt>{{ $t('dashboard.overdue') }}</dt>
				<dd>{{ overdueCount }}</dd>
			</div>
			<div class="is-success">
				<dt>{{ $t('home.team.done') }}</dt>
				<dd>{{ doneTasks.length }}</dd>
			</div>
		</dl>

		<ul
			v-if="people.length > 0"
			class="team-members"
		>
			<li
				v-for="member in people"
				:key="member.user!.id"
			>
				<UserAvatar
					:user="member.user!"
					:size="30"
					class="team-member-avatar"
				/>
				<span class="team-member-name">{{ memberName(member.user) }}</span>
				<span
					v-if="overdueOf(member) > 0"
					class="team-member-badge is-danger"
				>{{ $t('home.team.overdueCount', {count: overdueOf(member)}) }}</span>
				<span class="team-member-badge">{{ $t('home.team.openCount', {count: member.open.length}) }}</span>
			</li>
		</ul>
		<p
			v-else-if="!isLoading"
			class="overview-side-card__empty"
		>
			{{ $t('dashboard.empty') }}
		</p>
	</section>
</template>

<script setup lang="ts">
import {computed} from 'vue'

import UserAvatar from '@/components/misc/UserAvatar.vue'
import type {TaskResponse} from '@/client/queries/tasks'
import {isOverdue, memberName, type MemberWorkload} from '@/composables/useTeamWorkload'

const props = defineProps<{
	members: MemberWorkload[],
	openTasks: TaskResponse[],
	doneTasks: TaskResponse[],
	isLoading: boolean,
}>()

const people = computed(() => props.members.filter(member => member.user !== null))
const overdueCount = computed(() => props.openTasks.filter(task => isOverdue(task)).length)

function overdueOf(member: MemberWorkload) {
	return member.open.filter(task => isOverdue(task)).length
}
</script>

<style lang="scss" scoped>
.overview-side-card {
	padding: 1.1rem 1.25rem;
	border: 1px solid var(--grey-200);
	border-radius: $radius-large;
	background: var(--white);
	box-shadow: var(--shadow-xs);
}

.overview-side-card__header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: .5rem;
	margin-block-end: .9rem;

	h2 {
		margin: 0;
		font-size: 1.05rem;
	}
}

.overview-side-card__link {
	font-size: .8rem;
	font-weight: 600;
	white-space: nowrap;
}

.overview-side-card__empty {
	margin: 0;
	font-size: .85rem;
	color: var(--grey-500);
}

.team-stats {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: .5rem;
	margin: 0 0 1rem;

	div {
		padding: .6rem .75rem;
		border-radius: $radius;
		background: var(--grey-100);
	}

	dt {
		font-size: .7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: .03em;
		color: var(--grey-500);
	}

	dd {
		margin: 0;
		font-family: $vikunja-font;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--grey-900);
	}

	.is-danger dd {
		color: var(--danger-text);
	}

	.is-success dd {
		color: var(--success);
	}
}

.team-members {
	margin: 0;
	list-style: none;

	li {
		display: flex;
		align-items: center;
		gap: .6rem;
		padding: .4rem 0;

		& + li {
			border-block-start: 1px solid var(--grey-100);
		}
	}
}

.team-member-avatar {
	flex-shrink: 0;
	border-radius: 50%;
}

.team-member-name {
	flex: 1;
	min-inline-size: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: .9rem;
	font-weight: 500;
}

.team-member-badge {
	flex-shrink: 0;
	padding: .1rem .5rem;
	border-radius: 999px;
	background: var(--grey-100);
	color: var(--grey-600);
	font-size: .75rem;
	font-weight: 500;

	&.is-danger {
		color: var(--danger-text);
		background: hsla(var(--danger-h), var(--danger-s), var(--danger-l), .12);
	}
}
</style>
