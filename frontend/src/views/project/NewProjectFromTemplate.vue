<template>
	<CreateEdit
		v-model:loading="isSubmitting"
		:title="$t('project.template.title')"
		primary-icon="paste"
		:primary-label="$t('project.template.create')"
		:primary-disabled="!template || title === ''"
		@primary="createFromTemplate()"
	>
		<template v-if="templates.length === 0">
			<p>{{ $t('project.template.noTemplates') }}</p>
			<p class="has-text-grey">
				{{ $t('project.template.howTo', {folder: TEMPLATES_FOLDER}) }}
			</p>
		</template>
		<template v-else>
			<FormField :label="$t('project.template.template')">
				<div class="select is-fullwidth">
					<select
						v-model="templateId"
						:disabled="isSubmitting"
					>
						<option
							v-for="item in templates"
							:key="item.id"
							:value="item.id"
						>
							{{ item.title }}
						</option>
					</select>
				</div>
			</FormField>
			<FormField
				v-model="title"
				v-focus
				:label="$t('project.title')"
				:disabled="isSubmitting"
				:placeholder="$t('project.create.titlePlaceholder')"
				type="text"
				name="projectTitle"
				@keyup.enter="createFromTemplate()"
			/>
			<FormField :label="$t('project.parent')">
				<ProjectSearch v-model="parentProject" />
			</FormField>
			<FormField :label="$t('project.template.startDate')">
				<input
					v-model="startDate"
					class="input"
					type="date"
					:disabled="isSubmitting"
				>
				<p class="help">
					{{ $t('project.template.startDateHelp') }}
				</p>
			</FormField>
			<FancyCheckbox
				v-model="duplicateShares"
				class="mbs-2"
			>
				{{ $t('project.duplicate.shares') }}
			</FancyCheckbox>
		</template>
	</CreateEdit>
</template>

<script setup lang="ts">
import {computed, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRouter} from 'vue-router'
import {useQueryClient} from '@tanstack/vue-query'

import CreateEdit from '@/components/misc/CreateEdit.vue'
import FormField from '@/components/input/FormField.vue'
import FancyCheckbox from '@/components/input/FancyCheckbox.vue'
import ProjectSearch from '@/components/tasks/partials/ProjectSearch.vue'

import {
	useDuplicateProjectMutation,
	useUpdateProjectMutation,
	type ProjectResponse,
} from '@/client/queries/projects'
import {allTasksQuery} from '@/client/queries/tasks'
import {useUpdateTaskMutation} from '@/client/queries/taskMutations'
import {useProjects} from '@/composables/useProjects'
import {useTitle} from '@/composables/useTitle'
import {parseTaskDate, startOfDay} from '@/composables/useTeamWorkload'
import {success} from '@/message'

// Projects inside a top-level project with this name are offered as templates.
const TEMPLATES_FOLDER = 'Templates'
const DAY_MS = 24 * 60 * 60 * 1000

const {t} = useI18n({useScope: 'global'})
useTitle(() => t('project.template.title'))

const router = useRouter()
const queryClient = useQueryClient()
const projectList = useProjects()
const duplicateMutation = useDuplicateProjectMutation()
const updateProjectMutation = useUpdateProjectMutation()
const updateTaskMutation = useUpdateTaskMutation()

const templates = computed(() => {
	const folder = projectList.projectsArray.find(project =>
		project.parent_project_id === 0 && project.title.trim().toLowerCase() === TEMPLATES_FOLDER.toLowerCase())
	return folder
		? projectList.getChildProjects(folder.id).filter(project => !project.is_archived)
		: []
})

const templateId = ref(0)
const template = computed(() => templates.value.find(project => project.id === templateId.value))
watch(templates, list => {
	if (!template.value && list.length > 0) templateId.value = list[0].id
}, {immediate: true})

const title = ref('')
const parentProject = ref<ProjectResponse | null>(null)
const duplicateShares = ref(true)
const startDate = ref(toDateInput(new Date()))
const isSubmitting = ref(false)

function toDateInput(date: Date) {
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

async function createFromTemplate() {
	if (!template.value || title.value.trim() === '' || isSubmitting.value) return
	isSubmitting.value = true

	try {
		const duplicated = await duplicateMutation.mutateAsync({
			projectId: template.value.id,
			parentProjectId: parentProject.value?.id ?? 0,
			duplicateShares: duplicateShares.value,
		})
		await updateProjectMutation.mutateAsync({...duplicated, title: title.value.trim()})
		await shiftDueDates(duplicated.id)
		success({message: t('project.template.success')})
		await router.push({name: 'project.index', params: {projectId: duplicated.id}})
	} finally {
		isSubmitting.value = false
	}
}

// Moves every due date by the same number of days so the earliest one lands on the start date.
async function shiftDueDates(projectId: number) {
	if (!startDate.value) return
	const tasks = await queryClient.fetchQuery(allTasksQuery({project: projectId, params: {filter: ''}}))
	const dated = tasks
		.map(task => ({task, due: parseTaskDate(task.due_date)}))
		.filter((item): item is {task: typeof tasks[number], due: Date} => item.due !== null)
	if (dated.length === 0) return

	const earliest = startOfDay(new Date(Math.min(...dated.map(item => item.due.getTime()))))
	const [year, month, day] = startDate.value.split('-').map(Number)
	const offset = Math.round((new Date(year, month - 1, day).getTime() - earliest.getTime()) / DAY_MS)
	if (offset === 0) return

	for (const {task, due} of dated) {
		const shifted = new Date(due)
		shifted.setDate(shifted.getDate() + offset)
		await updateTaskMutation.mutateAsync({...task, due_date: shifted.toISOString()})
	}
}
</script>
