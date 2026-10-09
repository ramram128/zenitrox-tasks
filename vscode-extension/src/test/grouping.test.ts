import {test} from 'node:test'
import * as assert from 'node:assert/strict'

import type {Task} from '../api'
import {groupOf, groupTasks, relativeDue} from '../grouping'

const now = new Date(2026, 9, 9, 12, 0)
const task = (due: Date | string | null, extra: Partial<Task> = {}): Task => ({
	id: Math.random(),
	title: 't',
	project_id: 1,
	done: false,
	due_date: due instanceof Date ? due.toISOString() : due,
	...extra,
})

test('groups by due date', () => {
	assert.equal(groupOf(task(new Date(2026, 9, 9, 9)), now), 'overdue')
	assert.equal(groupOf(task(new Date(2026, 9, 9, 18)), now), 'today')
	assert.equal(groupOf(task(new Date(2026, 9, 12, 9)), now), 'week')
	assert.equal(groupOf(task(new Date(2026, 10, 30, 9)), now), 'later')
	assert.equal(groupOf(task('0001-01-01T00:00:00Z'), now), 'noDate')
	assert.equal(groupOf(task(null), now), 'noDate')
})

test('sorts by due date, then by priority', () => {
	const groups = groupTasks([
		task(new Date(2026, 9, 9, 20), {id: 1}),
		task(new Date(2026, 9, 9, 15), {id: 2, priority: 1}),
		task(new Date(2026, 9, 9, 15), {id: 3, priority: 4}),
	], now)
	assert.deepEqual(groups.get('today')!.map(t => t.id), [3, 2, 1])
})

test('describes relative due dates', () => {
	assert.equal(relativeDue(new Date(2026, 9, 9, 14), now), 'in 2 hours')
	assert.equal(relativeDue(new Date(2026, 9, 8, 12), now), '1 day ago')
	assert.equal(relativeDue(new Date(2026, 9, 9, 12, 30), now), 'in 30 minutes')
})
