<template>
	<div
		v-cy="'showTasks'"
		class="is-max-width-desktop has-text-start"
	>
		<div
			class="show-tasks-header"
			:class="{'has-tabs': tabs}"
		>
			<h2 class="mbe-2 title">
				{{ pageTitle }}
			</h2>
			<div
				v-if="tabs && hasTasks"
				class="task-tabs"
				role="tablist"
				:aria-label="pageTitle"
			>
				<button
					v-for="tab in taskTabs"
					:key="tab.key"
					type="button"
					role="tab"
					class="task-tab"
					:class="{'is-active': activeTab === tab.key, 'is-danger': tab.key === 'overdue' && tab.count > 0}"
					:aria-selected="activeTab === tab.key"
					@click="activeTab = tab.key"
				>
					{{ tab.label }}
					<span class="task-tab-count">{{ tab.count }}</span>
				</button>
			</div>
		</div>
		<Message
			v-if="filteredLabels.length > 0"
			class="label-filter-info mbe-2"
		>
			<i18n-t
				keypath="task.show.filterByLabel"
				tag="span"
				class="filter-label-text"
			>
				<template #label>
					<XLabel
						v-for="label in filteredLabels"
						:key="label.id"
						:label="label"
					/>
				</template>
			</i18n-t>
			<BaseButton
				v-tooltip="$t('task.show.clearLabelFilter')"
				class="clear-filter-button"
				:aria-label="$t('task.show.clearLabelFilter')"
				@click="clearLabelFilter"
			>
				<Icon icon="times" />
			</BaseButton>
		</Message>
		<Message
			v-if="savedFilterIgnored"
			class="mbe-2"
		>
			{{ $t('task.show.savedFilterIgnored') }}
		</Message>
		<p
			v-if="!showAll"
			class="show-tasks-options"
		>
			<DatepickerWithRange
				:model-value="{dateFrom: dateFrom ?? null, dateTo: dateTo ?? null}"
				@update:modelValue="setDate"
			>
				<template #trigger="{toggle}">
					<XButton
						variant="primary"
						:shadow="false"
						class="mbe-2"
						@click.prevent.stop="toggle()"
					>
						{{ $t('task.show.select') }}
					</XButton>
				</template>
			</DatepickerWithRange>
			<FancyCheckbox
				:model-value="showNulls"
				class="mie-2"
				@update:modelValue="setShowNulls"
			>
				{{ $t('task.show.noDates') }}
			</FancyCheckbox>
			<FancyCheckbox
				:model-value="showOverdue"
				@update:modelValue="setShowOverdue"
			>
				{{ $t('task.show.overdue') }}
			</FancyCheckbox>
		</p>
		<template v-if="!loading && (!tasks || tasks.length === 0) && showNothingToDo">
			<h3 class="has-text-centered mbs-6">
				{{ $t('task.show.noTasks') }}
			</h3>
		</template>

		<Card
			v-if="hasTasks"
			:padding="false"
			class="has-overflow"
			:has-content="false"
			:loading="loading"
		>
			<ul class="p-2 tasks">
				<li
					v-for="task in visibleTasks"
					:key="task.id"
				>
					<SingleTaskInProject
						:show-project="true"
						:the-task="task"
						:can-mark-as-done="(projectList.projects[task.project_id]?.max_permission ?? 0) > PERMISSIONS.READ"
						@taskUpdated="updateTasks"
					/>
				</li>
			</ul>
			<p
				v-if="visibleTasks.length === 0"
				class="task-tab-empty"
			>
				{{ $t('home.tabs.empty') }}
			</p>
		</Card>
		<div
			v-else
			:class="{ 'is-loading': showLoading}"
			class="spinner"
		/>
	</div>
</template>

<script setup lang="ts">
import {computed, ref, watch, watchEffect} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {useI18n} from 'vue-i18n'

import {formatDate} from '@/helpers/time/formatDate'
import {setTitle} from '@/helpers/setTitle'

import BaseButton from '@/components/base/BaseButton.vue'
import Icon from '@/components/misc/Icon'
import Message from '@/components/misc/Message.vue'
import FancyCheckbox from '@/components/input/FancyCheckbox.vue'
import SingleTaskInProject from '@/components/tasks/partials/SingleTaskInProject.vue'
import DatepickerWithRange from '@/components/date/DatepickerWithRange.vue'
import XLabel from '@/components/tasks/partials/Label.vue'
import {DATE_RANGES} from '@/components/date/dateRanges'
import {useAuthStore} from '@/stores/auth'
import {useProjects} from '@/composables/useProjects'
import {useLabels} from '@/composables/useLabels'
import type {TaskFilterParams} from '@/client/queries/tasks'
import {useTasks} from '@/composables/useTasks'
import {useDelayedLoading} from '@/composables/useDelayedLoading'
import type {TaskScope} from '@/client/queries/tasks'
import {PERMISSIONS} from '@/constants/permissions'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {isTaskDueToday, isTaskOverdue} from '@/helpers/taskUrgency'
import type {TaskResponse} from '@/client/queries/tasks'

const props = withDefaults(defineProps<{
	dateFrom?: Date | string,
	dateTo?: Date | string,
	showNulls?: boolean,
	showOverdue?: boolean,
	labelIds?: string[],
	tabs?: boolean,
}>(), {
	showNulls: false,
	showOverdue: false,
	dateFrom: undefined,
	dateTo: undefined,
	labelIds: undefined,
	tabs: false,
})

const emit = defineEmits<{
	'tasksLoaded': [loaded: true],
	'clearLabelFilter': [],
}>()

const authStore = useAuthStore()
const projectList = useProjects()
const {getLabelById} = useLabels()

const route = useRoute()
const router = useRouter()
const {t} = useI18n({useScope: 'global'})

const taskScope = ref<TaskScope | null>(null)
const taskQuery = useTasks(
	() => taskScope.value ?? {},
	{enabled: () => authStore.authenticated && taskScope.value !== null},
)
const tasks = taskQuery.tasks
const showNothingToDo = ref<boolean>(false)


setTimeout(() => showNothingToDo.value = true, 100)

const showAll = computed(() => typeof props.dateFrom === 'undefined' || typeof props.dateTo === 'undefined')

const filteredLabels = computed(() => {
	if (!props.labelIds || props.labelIds.length === 0) {
		return []
	}
	return props.labelIds
		.map(id => getLabelById(Number(id)))
		.filter(label => label !== null && label !== undefined)
})

const savedFilterIgnored = computed(() => {
	return filteredLabels.value.length > 0
		&& filterIdUsedOnOverview.value
		&& typeof projectList.projects[filterIdUsedOnOverview.value] !== 'undefined'
})

const pageTitle = computed(() => {
	// We need to define "key" because it is the first parameter in the array and we need the second
	const predefinedRange = Object.entries(DATE_RANGES)
		.find(([, value]) => props.dateFrom === value[0] && props.dateTo === value[1])
		?.[0]
	if (typeof predefinedRange !== 'undefined') {
		return t(`input.datepickerRange.ranges.${predefinedRange}`)
	}

	return showAll.value
		? t('task.show.titleCurrent')
		: t('task.show.fromuntil', {
			from: formatDate(props.dateFrom, 'LL'),
			until: formatDate(props.dateTo, 'LL'),
		})
})
const hasTasks = computed(() => tasks.value && tasks.value.length > 0)

type TaskTab = 'all' | 'today' | 'overdue' | 'mine'
const activeTab = ref<TaskTab>('all')
const {now} = useGlobalNow()
const tabFilters: Record<TaskTab, (task: TaskResponse) => boolean> = {
	all: () => true,
	today: task => isTaskDueToday(task, now.value),
	overdue: task => isTaskOverdue(task, now.value),
	mine: task => task.assignees.some(user => user.id === authStore.info?.id),
}
const taskTabs = computed(() => (['all', 'today', 'overdue', 'mine'] as const).map(key => ({
	key,
	label: t(`home.tabs.${key}`),
	count: (tasks.value ?? []).filter(tabFilters[key]).length,
})))
const visibleTasks = computed(() => props.tabs
	? (tasks.value ?? []).filter(tabFilters[activeTab.value])
	: (tasks.value ?? []))
const userAuthenticated = computed(() => authStore.authenticated)
const loading = taskQuery.isFetching
const showLoading = useDelayedLoading(loading)
const filterIdUsedOnOverview = computed(() => authStore.settings?.frontend_settings?.filter_id_used_on_overview)

interface dateStrings {
	dateFrom: Date | string | null,
	dateTo: Date | string | null,
}

function setDate(dates: dateStrings) {
	const from = dates.dateFrom ?? props.dateFrom
	const to = dates.dateTo ?? props.dateTo
	router.push({
		name: route.name as string,
		query: {
			from: from instanceof Date ? from.toISOString() : from,
			to: to instanceof Date ? to.toISOString() : to,
			showOverdue: props.showOverdue ? 'true' : 'false',
			showNulls: props.showNulls ? 'true' : 'false',
		},
	})
}

function setShowOverdue(show: boolean) {
	router.push({
		name: route.name as string,
		query: {
			...route.query,
			showOverdue: show ? 'true' : 'false',
		},
	})
}

function setShowNulls(show: boolean) {
	router.push({
		name: route.name as string,
		query: {
			...route.query,
			showNulls: show ? 'true' : 'false',
		},
	})
}

function clearLabelFilter() {
	emit('clearLabelFilter')
}

async function loadPendingTasks(from: Date|string|undefined, to: Date|string|undefined, filterId: number | null | undefined) {
	// FIXME: HACK! This should never happen.
	// Since this route is authentication only, users would get an error message if they access the page unauthenticated.
	// Since this component is mounted as the home page before unauthenticated users get redirected
	// to the login page, they will almost always see the error message.
	if (!userAuthenticated.value) {
		return
	}

	const params: TaskFilterParams = {
		sort_by: ['due_date', 'id'],
		order_by: ['asc', 'desc'],
		filter: 'done = false',
		filter_include_nulls: props.showNulls,
		q: '',
		expand: ['comment_count', 'is_unread'],
	}

	if (!showAll.value) {

		params.filter += ` && due_date < '${to instanceof Date ? to.toISOString() : to}'`

		// NOTE: Ideally we could also show tasks with a start or end date in the specified range, but the api
		//       is not capable (yet) of combining multiple filters with 'and' and 'or'.

		if (!props.showOverdue) {
			params.filter += ` && due_date > '${from instanceof Date ? from.toISOString() : from}'`
		}
	}

	// Add label filtering
	if (props.labelIds && props.labelIds.length > 0) {
		const labelFilter = `labels in ${props.labelIds.join(', ')}`
		params.filter += params.filter ? ` && ${labelFilter}` : labelFilter
	}

	let projectId = null
	if (showAll.value && filterId && typeof projectList.projects[filterId] !== 'undefined'
		&& (!props.labelIds || props.labelIds.length === 0)) {
		projectId = filterId
	}

	taskScope.value = {project: projectId, params: {...params, filter_timezone: authStore.settings.timezone}}
}

watch(taskQuery.data, data => { if (data) emit('tasksLoaded', true) })

function updateTasks() { return taskQuery.refetch() }

// Keep sidebar setting changes from reloading tasks.
watch(
	[
		() => props.dateFrom,
		() => props.dateTo,
		filterIdUsedOnOverview,
		() => props.showOverdue,
		() => props.showNulls,
		() => props.labelIds,
	],
	([from, to, filterId]) => loadPendingTasks(from, to, filterId),
	{immediate: true},
)
watchEffect(() => setTitle(pageTitle.value))
</script>

<style lang="scss" scoped>
.tasks {
	list-style: none;
	margin: 0;
}

.show-tasks-header.has-tabs {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: .5rem 1rem;
	margin-block-end: .75rem;

	.title {
		margin-block-end: 0 !important;
	}
}

.task-tabs {
	display: inline-flex;
	flex-wrap: wrap;
	gap: .25rem;
	padding: .25rem;
	border-radius: $radius;
	background: var(--grey-100);
}

.task-tab {
	display: inline-flex;
	align-items: center;
	gap: .4rem;
	padding: .35rem .75rem;
	border: 0;
	border-radius: $radius-small;
	background: transparent;
	color: var(--grey-600);
	font: inherit;
	font-size: .85rem;
	font-weight: 500;
	cursor: pointer;

	&:hover {
		color: var(--grey-900);
	}

	&.is-active {
		background: var(--white);
		color: var(--primary);
		font-weight: 600;
		box-shadow: var(--shadow-xs);
	}

	&:focus-visible {
		box-shadow: 0 0 0 2px hsla(var(--primary-hsl), 0.5);
	}
}

.task-tab-count {
	min-inline-size: 1.4rem;
	padding: 0 .4rem;
	border-radius: 999px;
	background: var(--grey-200);
	color: var(--grey-700);
	font-size: .7rem;
	font-weight: 600;
	text-align: center;

	.is-danger & {
		background: hsla(var(--danger-h), var(--danger-s), var(--danger-l), .15);
		color: var(--danger-text);
	}
}

.task-tab-empty {
	margin: 0;
	padding: 1.5rem;
	text-align: center;
	color: var(--grey-500);
}

.show-tasks-options {
	display: flex;
	flex-direction: column;
}

.label-filter-info {
	margin-block-end: 1rem;
	
	.clear-filter-button {
		margin-inline-start: auto;
		padding: 0.25rem 0.5rem;
		
		&:hover {
			color: var(--danger);
		}
	}

	:deep(.message.info) {
		inline-size: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}
}
</style>
