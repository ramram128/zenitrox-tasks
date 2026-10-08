import {computed} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import {allTasksQuery, type TaskFilterParams, type TaskResponse} from '@/client/queries/tasks'
import type {User} from '@/client/generated'
import {useTeamsPage} from '@/composables/useTeams'

export type MemberWorkload = {
	// null collects the tasks nobody is assigned to.
	user: User | null
	open: TaskResponse[]
	doneThisWeek: TaskResponse[]
}

const DONE_WINDOW_DAYS = 7

function filterParams(filter: string): TaskFilterParams {
	return {
		filter,
		filter_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		filter_include_nulls: false,
		sort_by: ['due_date', 'id'],
		order_by: ['asc', 'desc'],
	}
}

// The API reports an unset date as the zero time.
export function parseTaskDate(value?: string | null): Date | null {
	if (!value || value.startsWith('0001-')) return null
	return new Date(value)
}

export function startOfDay(date: Date): Date {
	const d = new Date(date)
	d.setHours(0, 0, 0, 0)
	return d
}

export function isOverdue(task: TaskResponse, now = new Date()): boolean {
	const due = parseTaskDate(task.due_date)
	return !task.done && due !== null && due < now
}

export function memberName(user: User | null): string {
	return user ? (user.name || user.username || '') : ''
}

/**
 * Loads every open task and every task completed in the last week across all
 * projects the current user can see, grouped by assignee. Members of the
 * user's teams are included even when they have no tasks.
 */
export function useTeamWorkload() {
	const openQuery = useQuery(computed(() => allTasksQuery({params: filterParams('done = false')})))
	const doneQuery = useQuery(computed(() => allTasksQuery({
		params: filterParams(`done = true && done_at >= now-${DONE_WINDOW_DAYS}d`),
	})))
	const {teams, isFetching: teamsFetching} = useTeamsPage(1)

	const members = computed<MemberWorkload[]>(() => {
		const byId = new Map<number, MemberWorkload>()
		const unassigned: MemberWorkload = {user: null, open: [], doneThisWeek: []}

		const memberFor = (user: User) => {
			const id = user.id ?? 0
			let entry = byId.get(id)
			if (!entry) {
				entry = {user, open: [], doneThisWeek: []}
				byId.set(id, entry)
			}
			return entry
		}

		for (const team of teams.value) {
			for (const member of team.members ?? []) {
				// Bot accounts are not people to plan work for.
				if (member.bot_owner_id) continue
				memberFor(member as User)
			}
		}

		const add = (tasks: TaskResponse[], key: 'open' | 'doneThisWeek') => {
			for (const task of tasks) {
				if (task.assignees.length === 0) {
					unassigned[key].push(task)
					continue
				}
				for (const assignee of task.assignees) {
					memberFor(assignee)[key].push(task)
				}
			}
		}
		add(openQuery.data.value ?? [], 'open')
		add(doneQuery.data.value ?? [], 'doneThisWeek')

		const list = [...byId.values()]
			.sort((a, b) => memberName(a.user).localeCompare(memberName(b.user)))
		if (unassigned.open.length > 0 || unassigned.doneThisWeek.length > 0) {
			list.push(unassigned)
		}
		return list
	})

	const openTasks = computed(() => openQuery.data.value ?? [])
	const doneTasks = computed(() => doneQuery.data.value ?? [])
	const isLoading = computed(() => openQuery.isLoading.value || doneQuery.isLoading.value || teamsFetching.value)

	function refetch() {
		return Promise.all([openQuery.refetch(), doneQuery.refetch()])
	}

	return {members, openTasks, doneTasks, isLoading, refetch}
}
