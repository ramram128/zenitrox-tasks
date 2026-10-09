import {PRIORITIES} from '@/constants/priorities'

type UrgencyTask = {
	done?: boolean,
	due_date?: string | null,
	priority?: number,
}

function dueTime(task: UrgencyTask): number {
	return task.due_date ? new Date(task.due_date).getTime() : 0
}

export function isTaskOverdue(task: UrgencyTask, now: Date): boolean {
	const due = dueTime(task)
	return !task.done && due > 0 && due <= now.getTime()
}

/** Open, not yet overdue, and due before the end of today. */
export function isTaskDueToday(task: UrgencyTask, now: Date): boolean {
	const due = dueTime(task)
	return !task.done
		&& due > now.getTime()
		&& new Date(due).toDateString() === now.toDateString()
}

/** Which colored stripe an open task gets for its priority, if any. */
export function taskPriorityAccent(task: UrgencyTask): 'high' | 'urgent' | undefined {
	const priority = task.priority ?? 0
	if (task.done || priority < PRIORITIES.HIGH) {
		return undefined
	}
	return priority >= PRIORITIES.URGENT ? 'urgent' : 'high'
}
