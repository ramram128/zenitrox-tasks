import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useQuery} from '@tanstack/vue-query'

import {allTasksQuery, type TaskResponse} from '@/client/queries/tasks'

export type ProjectProgress = {
	open: number
	done: number
}

function countByProject(tasks: TaskResponse[] | undefined, key: keyof ProjectProgress, into: Map<number, ProjectProgress>) {
	for (const task of tasks ?? []) {
		const entry = into.get(task.project_id)
		if (entry) entry[key]++
	}
}

/**
 * Counts open and done tasks for a handful of projects, e.g. the recently
 * viewed ones on the overview. Saved filters (negative ids) are skipped.
 */
export function useProjectProgress(projectIds: MaybeRefOrGetter<number[]>) {
	const ids = computed(() => toValue(projectIds).filter(id => id > 0))
	const scope = (done: boolean) => computed(() => ({
		...allTasksQuery({params: {filter: `done = ${done} && project in ${ids.value.join(', ')}`}}),
		enabled: ids.value.length > 0,
	}))
	const openQuery = useQuery(scope(false))
	const doneQuery = useQuery(scope(true))

	return computed(() => {
		const progress = new Map<number, ProjectProgress>(ids.value.map(id => [id, {open: 0, done: 0}]))
		countByProject(openQuery.data.value, 'open', progress)
		countByProject(doneQuery.data.value, 'done', progress)
		return progress
	})
}
