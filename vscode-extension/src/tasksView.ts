import * as vscode from 'vscode'

import type {Project, Task} from './api'
import {dueDate, GROUPS, groupTasks, priorityName, relativeDue, type GroupKey} from './grouping'

type Node = {kind: 'group', key: GroupKey, label: string, tasks: Task[]} | {kind: 'task', task: Task}

const GROUP_ICONS: Record<GroupKey, vscode.ThemeIcon> = {
	overdue: new vscode.ThemeIcon('error', new vscode.ThemeColor('list.errorForeground')),
	today: new vscode.ThemeIcon('calendar', new vscode.ThemeColor('list.warningForeground')),
	week: new vscode.ThemeIcon('calendar'),
	later: new vscode.ThemeIcon('history'),
	noDate: new vscode.ThemeIcon('circle-outline'),
}

export class TasksView implements vscode.TreeDataProvider<Node> {
	private readonly changed = new vscode.EventEmitter<void>()
	readonly onDidChangeTreeData = this.changed.event

	private tasks: Task[] = []
	private projects = new Map<number, string>()
	update(tasks: Task[], projects: Project[]) {
		this.tasks = tasks
		this.projects = new Map(projects.map(project => [project.id, project.title]))
		this.changed.fire()
	}

	clear() {
		this.update([], [])
	}

	/** Drops a task right away, e.g. after it was marked done. */
	remove(taskId: number) {
		this.tasks = this.tasks.filter(task => task.id !== taskId)
		this.changed.fire()
	}

	replace(updated: Task) {
		this.tasks = this.tasks.map(task => task.id === updated.id ? {...task, ...updated} : task)
		this.changed.fire()
	}

	getChildren(node?: Node): Node[] {
		if (node?.kind === 'task') {
			return []
		}
		if (node?.kind === 'group') {
			return node.tasks.map(task => ({kind: 'task', task}))
		}
		const groups = groupTasks(this.tasks, new Date())
		return GROUPS
			.map(({key, label}) => ({kind: 'group' as const, key, label, tasks: groups.get(key) ?? []}))
			.filter(group => group.tasks.length > 0)
	}

	getTreeItem(node: Node): vscode.TreeItem {
		if (node.kind === 'group') {
			const item = new vscode.TreeItem(node.label, node.key === 'later' || node.key === 'noDate'
				? vscode.TreeItemCollapsibleState.Collapsed
				: vscode.TreeItemCollapsibleState.Expanded)
			item.description = String(node.tasks.length)
			item.iconPath = GROUP_ICONS[node.key]
			item.id = `group-${node.key}`
			return item
		}

		const {task} = node
		const now = new Date()
		const due = dueDate(task)
		const project = this.projects.get(task.project_id)
		const progress = Math.round((task.percent_done ?? 0) * 100)
		const priority = priorityName(task.priority)

		const item = new vscode.TreeItem(task.title, vscode.TreeItemCollapsibleState.None)
		item.id = `task-${task.id}`
		item.contextValue = 'task'
		item.description = [
			project,
			due ? relativeDue(due, now) : undefined,
			progress > 0 ? `${progress}%` : undefined,
		].filter(Boolean).join(' · ')
		item.iconPath = (task.priority ?? 0) >= 4
			? new vscode.ThemeIcon('flame', new vscode.ThemeColor('list.errorForeground'))
			: (task.priority ?? 0) === 3
				? new vscode.ThemeIcon('arrow-up', new vscode.ThemeColor('list.warningForeground'))
				: new vscode.ThemeIcon('circle-large-outline')

		const tooltip = new vscode.MarkdownString(undefined, true)
		tooltip.appendMarkdown(`**${escapeMarkdown(task.title)}** ${task.identifier ?? ''}\n\n`)
		if (project) tooltip.appendMarkdown(`$(folder) ${escapeMarkdown(project)}  \n`)
		if (due) tooltip.appendMarkdown(`$(calendar) ${due.toLocaleString()} (${relativeDue(due, now)})  \n`)
		if (priority) tooltip.appendMarkdown(`$(flame) ${priority} priority  \n`)
		tooltip.appendMarkdown(`$(dashboard) ${progress}% done`)
		item.tooltip = tooltip

		return item
	}
}

export type TaskNode = Extract<Node, {kind: 'task'}>

function escapeMarkdown(text: string): string {
	return text.replace(/[\\`*_{}[\]()#+\-.!|<>]/g, '\\$&')
}
