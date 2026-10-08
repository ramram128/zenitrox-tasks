<template>
	<div
		class="content loader-container is-max-width-desktop team-dashboard"
		:class="{'is-loading': isLoading}"
	>
		<h1>{{ $t('dashboard.title') }}</h1>

		<div class="stats">
			<div class="stat">
				<span class="stat-value">{{ openTasks.length }}</span>
				<span class="stat-label">{{ $t('dashboard.open') }}</span>
			</div>
			<div
				class="stat"
				:class="{'is-danger': overdueTasks.length > 0}"
			>
				<span class="stat-value">{{ overdueTasks.length }}</span>
				<span class="stat-label">{{ $t('dashboard.overdue') }}</span>
			</div>
			<div class="stat">
				<span class="stat-value">{{ dueThisWeek.length }}</span>
				<span class="stat-label">{{ $t('dashboard.dueThisWeek') }}</span>
			</div>
			<div class="stat is-success">
				<span class="stat-value">{{ doneTasks.length }}</span>
				<span class="stat-label">{{ $t('dashboard.doneThisWeek') }}</span>
			</div>
		</div>

		<Card
			:title="$t('dashboard.completedPerDay')"
			class="mbe-4"
		>
			<div
				class="chart"
				role="img"
				:aria-label="$t('dashboard.completedPerDay')"
			>
				<div
					v-for="day in completedPerDay"
					:key="day.label"
					class="chart-column"
				>
					<span class="chart-count">{{ day.count || '' }}</span>
					<div
						class="chart-bar"
						:style="{blockSize: `${day.count / maxCompleted * 100}%`}"
					/>
					<span class="chart-label">{{ day.label }}</span>
				</div>
			</div>
		</Card>

		<Card
			:title="$t('dashboard.members')"
			:padding="false"
			:has-content="false"
		>
			<div class="table-wrapper">
				<table class="members">
					<thead>
						<tr>
							<th>{{ $t('dashboard.member') }}</th>
							<th>{{ $t('dashboard.open') }}</th>
							<th>{{ $t('dashboard.overdue') }}</th>
							<th>{{ $t('dashboard.dueToday') }}</th>
							<th>{{ $t('dashboard.doneThisWeek') }}</th>
							<th class="progress-column">
								{{ $t('dashboard.progress') }}
							</th>
						</tr>
					</thead>
					<tbody>
						<template
							v-for="member in rows"
							:key="member.key"
						>
							<tr
								class="member-row"
								:class="{'is-expanded': expanded === member.key}"
								tabindex="0"
								:aria-expanded="expanded === member.key"
								@click="toggle(member.key)"
								@keydown.enter.prevent="toggle(member.key)"
								@keydown.space.prevent="toggle(member.key)"
							>
								<td class="member-name">
									<UserAvatar
										v-if="member.user"
										:user="member.user"
										:size="28"
									/>
									<span>{{ member.name }}</span>
								</td>
								<td>{{ member.open.length }}</td>
								<td :class="{'has-text-danger has-text-weight-bold': member.overdue.length > 0}">
									{{ member.overdue.length }}
								</td>
								<td>{{ member.dueToday }}</td>
								<td class="has-text-success">
									{{ member.doneThisWeek.length }}
								</td>
								<td class="progress-column">
									<div
										class="progress"
										:title="`${member.percent}%`"
									>
										<div
											class="progress-fill"
											:style="{inlineSize: `${member.percent}%`}"
										/>
									</div>
								</td>
							</tr>
							<tr
								v-if="expanded === member.key"
								class="member-tasks"
							>
								<td colspan="6">
									<p
										v-if="member.open.length === 0"
										class="has-text-grey is-italic"
									>
										{{ $t('dashboard.noOpenTasks') }}
									</p>
									<ul v-else>
										<li
											v-for="task in member.open"
											:key="task.id"
										>
											<RouterLink :to="{name: 'task.detail', params: {id: task.id}}">
												{{ task.title }}
											</RouterLink>
											<span
												v-if="dueLabel(task)"
												class="due"
												:class="{'has-text-danger': isOverdue(task, now)}"
											>
												{{ dueLabel(task) }}
											</span>
										</li>
									</ul>
								</td>
							</tr>
						</template>
						<tr v-if="!isLoading && rows.length === 0">
							<td
								colspan="6"
								class="has-text-centered has-text-grey is-italic"
							>
								{{ $t('dashboard.empty') }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</Card>
	</div>
</template>

<script setup lang="ts">
import {computed, ref} from 'vue'
import {useI18n} from 'vue-i18n'
import {useNow} from '@vueuse/core'

import Card from '@/components/misc/Card.vue'
import UserAvatar from '@/components/misc/UserAvatar.vue'
import type {TaskResponse} from '@/client/queries/tasks'
import {useTitle} from '@/composables/useTitle'
import {
	isOverdue,
	memberName,
	parseTaskDate,
	startOfDay,
	useTeamWorkload,
} from '@/composables/useTeamWorkload'

const {t, locale} = useI18n({useScope: 'global'})
useTitle(() => t('dashboard.title'))

const now = useNow({interval: 60 * 1000})
const {members, openTasks, doneTasks, isLoading} = useTeamWorkload()

const overdueTasks = computed(() => openTasks.value.filter(task => isOverdue(task, now.value)))
const dueThisWeek = computed(() => {
	const end = startOfDay(now.value)
	end.setDate(end.getDate() + 7)
	return openTasks.value.filter(task => {
		const due = parseTaskDate(task.due_date)
		return due !== null && due >= now.value && due < end
	})
})

const rows = computed(() => {
	const today = startOfDay(now.value)
	const tomorrow = new Date(today)
	tomorrow.setDate(today.getDate() + 1)

	return members.value.map(member => {
		const overdue = member.open.filter(task => isOverdue(task, now.value))
		const dueToday = member.open.filter(task => {
			const due = parseTaskDate(task.due_date)
			return due !== null && due >= today && due < tomorrow
		}).length
		const total = member.open.length + member.doneThisWeek.length
		return {
			key: member.user?.id ?? 0,
			user: member.user,
			name: member.user ? memberName(member.user) : t('dashboard.unassigned'),
			open: member.open,
			overdue,
			dueToday,
			doneThisWeek: member.doneThisWeek,
			percent: total === 0 ? 0 : Math.round(member.doneThisWeek.length / total * 100),
		}
	})
})

const completedPerDay = computed(() => {
	const days = []
	const today = startOfDay(now.value)
	for (let offset = 6; offset >= 0; offset--) {
		const start = new Date(today)
		start.setDate(today.getDate() - offset)
		const end = new Date(start)
		end.setDate(start.getDate() + 1)
		const count = doneTasks.value.filter(task => {
			const doneAt = parseTaskDate(task.done_at)
			return doneAt !== null && doneAt >= start && doneAt < end
		}).length
		days.push({
			label: start.toLocaleDateString(locale.value, {weekday: 'short'}),
			count,
		})
	}
	return days
})
const maxCompleted = computed(() => Math.max(1, ...completedPerDay.value.map(day => day.count)))

const expanded = ref<number | null>(null)
function toggle(key: number) {
	expanded.value = expanded.value === key ? null : key
}

function dueLabel(task: TaskResponse) {
	const due = parseTaskDate(task.due_date)
	if (!due) return ''
	return due.toLocaleString(locale.value, {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'})
}
</script>

<style lang="scss" scoped>
.stats {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 1rem;
	margin-block-end: 1rem;

	@media screen and (max-width: $tablet) {
		grid-template-columns: repeat(2, 1fr);
	}
}

.stat {
	display: flex;
	flex-direction: column;
	padding: 1rem 1.25rem;
	background: var(--white);
	border-radius: $radius;
	box-shadow: var(--shadow-sm);

	&.is-danger .stat-value {
		color: var(--danger);
	}

	&.is-success .stat-value {
		color: var(--success);
	}
}

.stat-value {
	font-size: 2rem;
	font-weight: 700;
	line-height: 1.2;
}

.stat-label {
	color: var(--grey-500);
	font-size: .875rem;
}

.chart {
	display: flex;
	align-items: flex-end;
	gap: .75rem;
	block-size: 10rem;
}

.chart-column {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	block-size: 100%;
}

.chart-bar {
	inline-size: 100%;
	max-inline-size: 3rem;
	min-block-size: 2px;
	background: var(--primary);
	border-radius: $radius $radius 0 0;
}

.chart-count {
	font-size: .75rem;
	font-weight: 600;
	min-block-size: 1rem;
}

.chart-label {
	margin-block-start: .25rem;
	font-size: .75rem;
	color: var(--grey-500);
}

.table-wrapper {
	overflow-x: auto;
}

table.members {
	inline-size: 100%;
	border-collapse: collapse;

	th, td {
		padding: .6rem 1rem;
		text-align: start;
		border-block-end: 1px solid var(--grey-200);
		white-space: nowrap;
	}

	th {
		font-size: .8rem;
		font-weight: 600;
		color: var(--grey-500);
		text-transform: uppercase;
	}
}

.member-row {
	cursor: pointer;

	&:hover, &.is-expanded {
		background: var(--grey-100);
	}
}

.member-name {
	display: flex;
	align-items: center;
	gap: .5rem;
	font-weight: 600;

	img {
		border-radius: 100%;
	}
}

.progress-column {
	inline-size: 25%;
	min-inline-size: 8rem;
}

.progress {
	block-size: .5rem;
	background: var(--grey-200);
	border-radius: 1rem;
	overflow: hidden;
}

.progress-fill {
	block-size: 100%;
	background: var(--success);
}

.member-tasks {
	background: var(--grey-100);

	ul {
		margin: 0;
		padding-inline-start: 1.25rem;
	}

	li {
		white-space: normal;
		margin-block: .25rem;
	}

	.due {
		margin-inline-start: .5rem;
		font-size: .85rem;
		color: var(--grey-500);
	}
}
</style>
