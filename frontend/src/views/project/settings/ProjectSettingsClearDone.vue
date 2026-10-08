<template>
	<Modal
		@close="$router.back()"
		@submit="clearDone()"
	>
		<template #header>
			<span>{{ $t('project.clearDone.title') }}</span>
		</template>

		<template #text>
			<p v-if="doneQuery.isLoading.value">
				{{ $t('misc.loading') }}
			</p>
			<p v-else-if="doneTasks.length === 0">
				{{ $t('project.clearDone.none') }}
			</p>
			<template v-else>
				<p>{{ $t('project.clearDone.text', {count: doneTasks.length, project: project?.title ?? ''}) }}</p>
				<p class="has-text-weight-bold">
					{{ $t('project.clearDone.irreversible') }}
				</p>
			</template>
		</template>
	</Modal>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'
import {useQuery} from '@tanstack/vue-query'

import Modal from '@/components/misc/Modal.vue'
import {allTasksQuery} from '@/client/queries/tasks'
import {useDeleteTaskMutation} from '@/client/queries/taskMutations'
import {useProjects} from '@/composables/useProjects'
import {useTitle} from '@/composables/useTitle'
import {error, success} from '@/message'

defineOptions({name: 'ProjectSettingsClearDone'})

const {t} = useI18n({useScope: 'global'})
const route = useRoute()
const router = useRouter()
const projectList = useProjects()

const projectId = computed(() => Number(route.params.projectId))
const project = computed(() => projectList.projects[projectId.value])
useTitle(() => t('project.clearDone.title'))

const doneQuery = useQuery(computed(() => ({
	...allTasksQuery({project: projectId.value, params: {filter: 'done = true'}}),
	enabled: projectId.value > 0,
})))
const doneTasks = computed(() => doneQuery.data.value ?? [])

const deleteMutation = useDeleteTaskMutation()
const deleting = ref(false)

async function clearDone() {
	if (deleting.value) return
	if (doneTasks.value.length === 0) {
		router.back()
		return
	}

	deleting.value = true
	let deleted = 0
	try {
		for (const task of doneTasks.value) {
			await deleteMutation.mutateAsync(task.id)
			deleted++
		}
		success({message: t('project.clearDone.success', {count: deleted})})
	} catch (e) {
		error(e)
	} finally {
		deleting.value = false
		router.back()
	}
}
</script>
