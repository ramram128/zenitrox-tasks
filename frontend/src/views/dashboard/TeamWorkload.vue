<template>
	<div
		class="content loader-container team-workload"
		:class="{'is-loading': isLoading}"
	>
		<h1>{{ $t('workload.title') }}</h1>
		<p class="has-text-grey">
			{{ $t('workload.description') }}
		</p>

		<div class="legend">
			<span><i class="swatch level-1" />{{ $t('workload.light') }}</span>
			<span><i class="swatch level-2" />{{ $t('workload.busy') }}</span>
			<span><i class="swatch level-3" />{{ $t('workload.overloaded') }}</span>
		</div>

		<Card
			:padding="false"
			:has-content="false"
		>
			<div class="table-wrapper">
				<table class="workload">
					<thead>
						<tr>
							<th class="member-column">
								{{ $t('dashboard.member') }}
							</th>
							<th class="is-overdue-column">
								{{ $t('dashboard.overdue') }}
							</th>
							<th
								v-for="day in days"
								:key="day.key"
								:class="{'is-weekend': day.weekend, 'is-today': day.today}"
							>
								<span class="weekday">{{ day.weekday }}</span>
								<span class="date">{{ day.date }}</span>
							</th>
						</tr>
					</thead>
					<tbody>
						<tr
							v-for="row in rows"
							:key="row.key"
						>
							<td class="member-column">
								<span class="member">
									<UserAvatar
										v-if="row.user"
										:user="row.user"
										:size="24"
									/>
									<span>{{ row.name }}</span>
								</span>
							</td>
							<td class="is-overdue-column">
								<button
									v-if="row.overdue.length > 0"
									class="cell level-overdue"
									:class="{'is-selected': isSelected(row.key, 'overdue')}"
									@click="select(row.key, 'overdue', row.name, $t('dashboard.overdue'), row.overdue)"
								>
									{{ row.overdue.length }}
								</button>
							</td>
							<td
								v-for="(tasks, index) in row.perDay"
								:key="days[index].key"
								:class="{'is-weekend': days[index].weekend, 'is-today': days[index].today}"
							>
								<button
									v-if="tasks.length > 0"
									class="cell"
									:class="[levelClass(tasks.length), {'is-selected': isSelected(row.key, days[index].key)}]"
									@click="select(row.key, days[index].key, row.name, days[index].long, tasks)"
								>
									{{ tasks.length }}
								</button>
							</td>
						</tr>
						<tr v-if="!isLoading && rows.length === 0">
							<td
								:colspan="days.length + 2"
								class="has-text-centered has-text-grey is-italic"
							>
								{{ $t('dashboard.empty') }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</Card>

		<Card
			v-if="selected"
			:title="`${selected.name} · ${selected.label}`"
			class="mbs-4"
		>
			<ul class="selected-tasks">
				<li
					v-for="task in selected.tasks"
					:key="task.id"
				>
					<RouterLink :to="{name: 'task.detail', params: {id: task.id}}">
						{{ task.title }}
					</RouterLink>
				</li>
			</ul>
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

const DAYS_SHOWN = 14
// Tasks due on one day for one person: up to BUSY is light, up to OVERLOADED is busy.
const BUSY = 2
const OVERLOADED = 4

const {t, locale} = useI18n({useScope: 'global'})
useTitle(() => t('workload.title'))

const now = useNow({interval: 60 * 1000})
const {members, isLoading} = useTeamWorkload()

function dayKey(date: Date) {
	return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const days = computed(() => {
	const today = startOfDay(now.value)
	return Array.from({length: DAYS_SHOWN}, (_, offset) => {
		const date = new Date(today)
		date.setDate(today.getDate() + offset)
		return {
			key: dayKey(date),
			weekday: date.toLocaleDateString(locale.value, {weekday: 'short'}),
			date: date.getDate(),
			long: date.toLocaleDateString(locale.value, {weekday: 'long', day: 'numeric', month: 'short'}),
			weekend: date.getDay() === 0 || date.getDay() === 6,
			today: offset === 0,
		}
	})
})

const rows = computed(() => members.value.map(member => {
	const perDay: TaskResponse[][] = days.value.map(() => [])
	const indexByKey = new Map(days.value.map((day, index) => [day.key, index]))
	const overdue: TaskResponse[] = []

	for (const task of member.open) {
		if (isOverdue(task, now.value)) {
			overdue.push(task)
			continue
		}
		const due = parseTaskDate(task.due_date)
		if (!due) continue
		const index = indexByKey.get(dayKey(due))
		if (index !== undefined) perDay[index].push(task)
	}

	return {
		key: member.user?.id ?? 0,
		user: member.user,
		name: member.user ? memberName(member.user) : t('dashboard.unassigned'),
		overdue,
		perDay,
	}
}))

function levelClass(count: number) {
	if (count > OVERLOADED) return 'level-3'
	if (count > BUSY) return 'level-2'
	return 'level-1'
}

const selected = ref<{rowKey: number, dayKey: string, name: string, label: string, tasks: TaskResponse[]} | null>(null)

function select(rowKey: number, key: string, name: string, label: string, tasks: TaskResponse[]) {
	selected.value = isSelected(rowKey, key) ? null : {rowKey, dayKey: key, name, label, tasks}
}

function isSelected(rowKey: number, key: string) {
	return selected.value?.rowKey === rowKey && selected.value?.dayKey === key
}
</script>

<style lang="scss" scoped>
.legend {
	display: flex;
	gap: 1.25rem;
	margin-block-end: 1rem;
	font-size: .85rem;
	color: var(--grey-600);

	span {
		display: flex;
		align-items: center;
		gap: .4rem;
	}
}

.swatch {
	display: inline-block;
	inline-size: .9rem;
	block-size: .9rem;
	border-radius: 3px;
}

.level-1 {
	background: hsla(var(--success-h), var(--success-s), var(--success-l), .25);
}

.level-2 {
	background: hsla(var(--warning-h), var(--warning-s), var(--warning-l), .45);
}

.level-3, .level-overdue {
	background: var(--danger);
	color: var(--white);
}

.table-wrapper {
	overflow-x: auto;
}

table.workload {
	border-collapse: collapse;
	inline-size: 100%;

	th, td {
		padding: .35rem;
		text-align: center;
		border-block-end: 1px solid var(--grey-200);
		min-inline-size: 2.75rem;
	}

	th {
		font-size: .75rem;
		color: var(--grey-500);
		font-weight: 600;
	}

	.weekday, .date {
		display: block;
	}

	.date {
		font-size: .95rem;
		color: var(--text);
	}

	.is-weekend {
		background: var(--grey-100);
	}

	th.is-today {
		color: var(--primary);

		.date {
			color: var(--primary);
		}
	}
}

.member-column {
	position: sticky;
	inset-inline-start: 0;
	z-index: 1;
	background: var(--white);
	text-align: start !important;
	white-space: nowrap;

	.member {
		display: flex;
		align-items: center;
		gap: .5rem;
		font-weight: 600;
	}

	img {
		border-radius: 100%;
	}
}

.is-overdue-column {
	border-inline-end: 1px solid var(--grey-200);
}

.cell {
	inline-size: 2.1rem;
	block-size: 2.1rem;
	border: 0;
	border-radius: $radius;
	font-weight: 700;
	cursor: pointer;
	color: var(--text);

	&.is-selected {
		outline: 2px solid var(--primary);
		outline-offset: 1px;
	}
}

.selected-tasks {
	margin: 0;
	padding-inline-start: 1.25rem;
}
</style>
