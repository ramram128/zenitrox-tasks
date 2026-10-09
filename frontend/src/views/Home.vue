<template>
	<div class="overview">
		<Message
			v-if="deletionScheduledAt !== null"
			variant="danger"
			class="mbe-4"
		>
			{{
				$t('user.deletion.scheduled', {
					date: formatDisplayDate(deletionScheduledAt),
					dateSince: formatDateSince(deletionScheduledAt),
				})
			}}
			<RouterLink :to="{name: 'user.settings.deletion'}">
				{{ $t('user.deletion.scheduledCancel') }}
			</RouterLink>
		</Message>

		<section class="overview-hero">
			<div class="overview-hero__text">
				<h1 v-if="salutation">
					{{ salutation }}
				</h1>
				<dl class="overview-hero__stats">
					<div>
						<dt>{{ $t('home.stats.myOpen') }}</dt>
						<dd>{{ myStats.open }}</dd>
					</div>
					<div :class="{'is-warning': myStats.dueToday > 0}">
						<dt>{{ $t('dashboard.dueToday') }}</dt>
						<dd>{{ myStats.dueToday }}</dd>
					</div>
					<div :class="{'is-danger': myStats.overdue > 0}">
						<dt>{{ $t('dashboard.overdue') }}</dt>
						<dd>{{ myStats.overdue }}</dd>
					</div>
				</dl>
			</div>
			<div class="overview-hero__actions">
				<RouterLink
					:to="{name: 'tasks.range'}"
					class="overview-hero__action"
				>
					<Icon :icon="['far', 'calendar-alt']" />
					{{ $t('navigation.upcoming') }}
				</RouterLink>
				<RouterLink
					:to="{name: 'workload'}"
					class="overview-hero__action"
				>
					<Icon icon="table-cells" />
					{{ $t('navigation.workload') }}
				</RouterLink>
			</div>
		</section>

		<section class="overview-quick-add">
			<AddTask @tasksAdded="updateTaskKey" />
			<p
				v-if="quickAddPrefixes"
				class="overview-quick-add__hints"
			>
				<span><kbd>{{ quickAddPrefixes.assignee }}</kbd> {{ $t('home.quickAdd.assignee') }}</span>
				<span><kbd>{{ quickAddPrefixes.label }}</kbd> {{ $t('home.quickAdd.label') }}</span>
				<span><kbd>{{ quickAddPrefixes.project }}</kbd> {{ $t('home.quickAdd.project') }}</span>
				<span><kbd>{{ quickAddPrefixes.priority }}3</kbd> {{ $t('home.quickAdd.priority') }}</span>
				<span><kbd>{{ $t('home.quickAdd.dateExample') }}</kbd> {{ $t('home.quickAdd.date') }}</span>
			</p>
		</section>

		<ImportHint v-if="tasksLoaded" />

		<section
			v-if="authStore.settings.frontend_settings.show_last_viewed !== false && projectHistory.length > 0"
			class="overview-section"
		>
			<header class="overview-section__header">
				<h2>{{ $t('home.lastViewed') }}</h2>
				<RouterLink :to="{name: 'projects.index'}">
					{{ $t('home.viewAllProjects') }}
				</RouterLink>
			</header>
			<ul
				v-cy="'projectCardGrid'"
				class="overview-projects"
			>
				<li
					v-for="project in projectHistory"
					:key="project.id"
				>
					<OverviewProjectCard
						:project="project"
						:progress="projectProgress.get(project.id)"
					/>
				</li>
			</ul>
		</section>

		<div class="overview-columns">
			<ShowTasks
				v-if="projectList.hasProjects"
				:key="showTasksKey"
				:label-ids="labelIds"
				tabs
				class="overview-tasks"
				@tasksLoaded="tasksLoaded = true"
				@clearLabelFilter="handleClearLabelFilter"
			/>
			<aside class="overview-aside">
				<OverviewTeamCard
					:members="workload.members.value"
					:open-tasks="workload.openTasks.value"
					:done-tasks="workload.doneTasks.value"
					:is-loading="workload.isLoading.value"
				/>
			</aside>
		</div>
	</div>
</template>

<script lang="ts" setup>
import {ref, computed} from 'vue'
import {useRoute, useRouter} from 'vue-router'

import Message from '@/components/misc/Message.vue'
import ShowTasks from '@/views/tasks/ShowTasks.vue'
import OverviewProjectCard from '@/components/home/OverviewProjectCard.vue'
import OverviewTeamCard from '@/components/home/OverviewTeamCard.vue'
import AddTask from '@/components/tasks/AddTask.vue'
import ImportHint from '@/components/home/ImportHint.vue'

import {getHistory} from '@/modules/projectHistory'
import {parseDateOrNull} from '@/helpers/parseDateOrNull'
import {formatDateSince, formatDisplayDate} from '@/helpers/time/formatDate'
import {useDaytimeSalutation} from '@/composables/useDaytimeSalutation'
import {useProjectProgress} from '@/composables/useProjectProgress'
import {useTeamWorkload} from '@/composables/useTeamWorkload'
import {useGlobalNow} from '@/composables/useGlobalNow'
import {isTaskDueToday, isTaskOverdue} from '@/helpers/taskUrgency'
import {PREFIXES} from '@/modules/quickAddMagic/prefixes'

import {useProjects} from '@/composables/useProjects'
import {useAuthStore} from '@/stores/auth'

const salutation = useDaytimeSalutation()

const authStore = useAuthStore()
const projectList = useProjects()
const route = useRoute()
const router = useRouter()

const projectHistory = computed(() => {
	// If we don't check this, it tries to load the project background right after logging out	
	if(!authStore.authenticated) {
		return []
	}
	
	return getHistory()
		.map(l => projectList.projects[l.id])
		.filter(l => Boolean(l))
})

const projectProgress = useProjectProgress(() => projectHistory.value.map(project => project.id))

const workload = useTeamWorkload()
const {now} = useGlobalNow()
const myStats = computed(() => {
	const userId = authStore.info?.id
	const mine = workload.openTasks.value.filter(task => task.assignees.some(user => user.id === userId))
	return {
		open: mine.length,
		dueToday: mine.filter(task => isTaskDueToday(task, now.value)).length,
		overdue: mine.filter(task => isTaskOverdue(task, now.value)).length,
	}
})

const quickAddPrefixes = computed(() => PREFIXES[authStore.settings.frontend_settings.quick_add_magic_mode])

const tasksLoaded = ref(false)

const deletionScheduledAt = computed(() => parseDateOrNull(authStore.info?.deletion_scheduled_at))

// Extract label IDs from query parameter
const labelIds = computed(() => {
	const labelsParam = route.query.labels
	if (!labelsParam) {
		return undefined
	}
	return Array.isArray(labelsParam) ? labelsParam.filter((id): id is string => id !== null) : [labelsParam]
})

// This is to reload the tasks list after adding a new task through the global task add.
// FIXME: Should use pinia (somehow?)
const showTasksKey = ref(0)

function updateTaskKey() {
	showTasksKey.value++
}

function handleClearLabelFilter() {
	const query = {...route.query}
	delete query.labels
	router.push({
		name: route.name as string,
		query,
	})
}
</script>

<style scoped lang="scss">
.overview {
	display: flex;
	flex-direction: column;
	gap: 1.25rem;
	max-inline-size: 1200px;
	margin-inline: auto;
}

.overview-hero,
.overview-quick-add {
	padding: 1.25rem 1.5rem;
	border: 1px solid var(--grey-200);
	border-radius: $radius-large;
	background: var(--white);
	box-shadow: var(--shadow-xs);
}

.overview-hero {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: 1rem 2rem;
	padding-block: 1.5rem;
	background:
		radial-gradient(circle at 100% 0, hsla(var(--primary-h), var(--primary-s), var(--primary-l), .08), transparent 55%),
		var(--white);

	h1 {
		margin: 0 0 .75rem;
		font-size: 2rem;
	}
}

.overview-hero__stats {
	display: flex;
	flex-wrap: wrap;
	gap: .5rem;
	margin: 0;

	div {
		display: flex;
		align-items: baseline;
		gap: .4rem;
		padding: .35rem .8rem;
		border-radius: 999px;
		background: var(--grey-100);
	}

	dt {
		font-size: .85rem;
		color: var(--grey-600);
	}

	dd {
		margin: 0;
		font-weight: 700;
		color: var(--grey-900);
	}

	.is-warning {
		background: hsla(var(--warning-h), var(--warning-s), var(--warning-l), .15);

		dt, dd {
			color: var(--warning-text);
		}
	}

	.is-danger {
		background: hsla(var(--danger-h), var(--danger-s), var(--danger-l), .12);

		dt, dd {
			color: var(--danger-text);
		}
	}
}

.overview-hero__actions {
	display: flex;
	flex-wrap: wrap;
	gap: .5rem;
}

.overview-hero__action {
	display: inline-flex;
	align-items: center;
	gap: .5rem;
	padding: .55rem 1rem;
	border-radius: $radius;
	background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), .1);
	color: var(--primary);
	font-size: .9rem;
	font-weight: 600;

	&:hover {
		background: hsla(var(--primary-h), var(--primary-s), var(--primary-l), .18);
	}
}

.overview-quick-add {
	padding: 1rem;
}

.overview-quick-add__hints {
	display: flex;
	flex-wrap: wrap;
	gap: .35rem 1rem;
	margin: .75rem 0 0;
	padding-inline-start: .25rem;
	font-size: .8rem;
	color: var(--grey-500);

	kbd {
		padding: .05rem .4rem;
		border: 1px solid var(--grey-200);
		border-radius: $radius-small;
		background: var(--grey-100);
		color: var(--grey-700);
		font-family: inherit;
		font-size: .75rem;
		font-weight: 600;
	}
}

.overview-section__header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 1rem;
	margin-block-end: .75rem;

	h2 {
		margin: 0;
	}

	a {
		font-size: .85rem;
		font-weight: 600;
	}
}

.overview-projects {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
	gap: 1rem;
	margin: 0;
	list-style: none;
}

.overview-columns {
	display: grid;
	grid-template-columns: minmax(0, 1fr) 320px;
	gap: 1.25rem;
	align-items: start;

	@media screen and (max-width: $desktop) {
		grid-template-columns: minmax(0, 1fr);
	}
}

.overview-tasks {
	max-inline-size: none;
}

@media screen and (max-width: $tablet) {
	.overview-hero {
		padding: 1.25rem;

		h1 {
			font-size: 1.5rem;
		}
	}

	.overview-quick-add__hints {
		display: none;
	}
}
</style>
