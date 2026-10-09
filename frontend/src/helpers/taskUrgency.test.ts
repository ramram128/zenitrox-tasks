import {describe, expect, it} from 'vitest'

import {isTaskDueToday, isTaskOverdue, taskPriorityAccent} from './taskUrgency'

const now = new Date(2026, 9, 9, 12, 0)
const at = (hours: number, day = 9) => new Date(2026, 9, day, hours, 0).toISOString()

describe('taskUrgency', () => {
	it('treats a past due date on an open task as overdue', () => {
		expect(isTaskOverdue({due_date: at(9)}, now)).toBe(true)
		expect(isTaskOverdue({due_date: at(9), done: true}, now)).toBe(false)
		expect(isTaskOverdue({due_date: '0001-01-01T00:00:00Z'}, now)).toBe(false)
	})

	it('counts later today as due today, but not overdue or tomorrow', () => {
		expect(isTaskDueToday({due_date: at(17)}, now)).toBe(true)
		expect(isTaskDueToday({due_date: at(9)}, now)).toBe(false)
		expect(isTaskDueToday({due_date: at(9, 10)}, now)).toBe(false)
	})

	it('only gives open high-priority tasks an accent', () => {
		expect(taskPriorityAccent({priority: 2})).toBeUndefined()
		expect(taskPriorityAccent({priority: 3})).toBe('high')
		expect(taskPriorityAccent({priority: 5})).toBe('urgent')
		expect(taskPriorityAccent({priority: 5, done: true})).toBeUndefined()
	})
})
