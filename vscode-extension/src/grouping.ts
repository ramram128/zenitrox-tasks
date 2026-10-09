import type {Task} from './api'

export type GroupKey = 'overdue' | 'today' | 'week' | 'later' | 'noDate'

export const GROUPS: {key: GroupKey, label: string}[] = [
	{key: 'overdue', label: 'Overdue'},
	{key: 'today', label: 'Today'},
	{key: 'week', label: 'Next 7 days'},
	{key: 'later', label: 'Later'},
	{key: 'noDate', label: 'No due date'},
]

/** The API reports an unset date as the zero time. */
export function dueDate(task: Task): Date | null {
	const value = task.due_date
	if (!value || value.startsWith('0001-')) {
		return null
	}
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? null : date
}

function endOfDay(date: Date, plusDays = 0): Date {
	const end = new Date(date)
	end.setDate(end.getDate() + plusDays)
	end.setHours(23, 59, 59, 999)
	return end
}

export function groupOf(task: Task, now: Date): GroupKey {
	const due = dueDate(task)
	if (due === null) return 'noDate'
	if (due <= now) return 'overdue'
	if (due <= endOfDay(now)) return 'today'
	if (due <= endOfDay(now, 7)) return 'week'
	return 'later'
}

export function groupTasks(tasks: Task[], now: Date): Map<GroupKey, Task[]> {
	const groups = new Map<GroupKey, Task[]>(GROUPS.map(group => [group.key, []]))
	for (const task of tasks) {
		groups.get(groupOf(task, now))!.push(task)
	}
	for (const list of groups.values()) {
		list.sort((a, b) =>
			(dueDate(a)?.getTime() ?? Infinity) - (dueDate(b)?.getTime() ?? Infinity)
			|| (b.priority ?? 0) - (a.priority ?? 0))
	}
	return groups
}

const PRIORITY_NAMES = ['', 'Low', 'Medium', 'High', 'Urgent', 'DO NOW']

export function priorityName(priority = 0): string {
	return PRIORITY_NAMES[priority] ?? ''
}

/** "in 3 days", "2 hours ago" and similar, for the task description. */
export function relativeDue(due: Date, now: Date): string {
	const minutes = Math.round((due.getTime() - now.getTime()) / 60_000)
	const abs = Math.abs(minutes)
	const [amount, unit] = abs < 60 ? [abs, 'minute']
		: abs < 60 * 24 ? [Math.round(abs / 60), 'hour']
			: [Math.round(abs / (60 * 24)), 'day']
	const text = `${amount} ${unit}${amount === 1 ? '' : 's'}`
	return minutes >= 0 ? `in ${text}` : `${text} ago`
}
