import * as vscode from 'vscode'

import * as os from 'node:os'

import {ApiError, createTokenWithPassword, ERR_TOTP_PASSCODE, normalizeBaseUrl, ZenitroxClient, type Task, type User} from './api'
import {groupOf} from './grouping'
import {AccountView} from './accountView'
import {TasksView, type TaskNode} from './tasksView'

const TOKEN_KEY = 'zenitrox.apiToken'
const REQUIRED_PERMISSIONS = '"tasks": all, "projects": read all, "other": user'

let client: ZenitroxClient | undefined
let me: User | undefined
let refreshTimer: NodeJS.Timeout | undefined
let refreshing: Promise<void> | undefined

export async function activate(context: vscode.ExtensionContext) {
	const view = new TasksView()
	const treeView = vscode.window.createTreeView('zenitrox.myTasks', {treeDataProvider: view})
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50)
	statusBar.command = 'zenitrox.focus'
	const accountView = new AccountView()
	context.subscriptions.push(treeView, statusBar, vscode.window.createTreeView('zenitrox.account', {treeDataProvider: accountView}))

	function setStatus(tasks: Task[] | undefined, error?: string) {
		if (!client) {
			statusBar.hide()
			return
		}
		if (error) {
			statusBar.text = '$(warning) Zenitrox'
			statusBar.tooltip = `Zenitrox: ${error}`
			statusBar.backgroundColor = undefined
			statusBar.show()
			return
		}
		const now = new Date()
		const overdue = tasks?.filter(task => groupOf(task, now) === 'overdue').length ?? 0
		const today = tasks?.filter(task => groupOf(task, now) === 'today').length ?? 0
		statusBar.text = overdue > 0 || today > 0
			? `$(checklist) ${[overdue > 0 ? `${overdue} overdue` : '', today > 0 ? `${today} today` : ''].filter(Boolean).join(' · ')}`
			: `$(checklist) ${tasks?.length ?? 0}`
		statusBar.tooltip = `Zenitrox: ${tasks?.length ?? 0} open tasks assigned to ${displayName(me)}`
		statusBar.backgroundColor = overdue > 0 ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined
		statusBar.show()
		treeView.badge = overdue > 0 ? {value: overdue, tooltip: `${overdue} overdue`} : undefined
	}

	async function load() {
		if (!client || !me) return
		try {
			// Project names are a nice-to-have; a token without "projects: read all" still lists tasks.
			const [tasks, projects] = await Promise.all([
				client.myOpenTasks(me.username),
				client.projects().catch(() => []),
			])
			view.update(tasks, projects)
			setStatus(tasks)
			treeView.message = tasks.length === 0 ? 'Nothing assigned to you. 🎉' : undefined
		} catch (e) {
			setStatus(undefined, errorText(e))
			treeView.message = `Could not load tasks: ${errorText(e)}`
		}
	}

	function refresh() {
		// Coalesce clicks and timer ticks into one request at a time.
		refreshing ??= load().finally(() => refreshing = undefined)
		return refreshing
	}

	function restartTimer() {
		if (refreshTimer) clearInterval(refreshTimer)
		const minutes = Math.max(1, vscode.workspace.getConfiguration('zenitrox').get<number>('refreshMinutes', 5))
		refreshTimer = setInterval(refresh, minutes * 60_000)
	}

	async function connect(token: string): Promise<boolean> {
		const url = vscode.workspace.getConfiguration('zenitrox').get<string>('url', '')
		const candidate = new ZenitroxClient(url, token)
		try {
			me = await candidate.currentUser()
		} catch (e) {
			client = undefined
			await vscode.commands.executeCommand('setContext', 'zenitrox.signedIn', false)
			const reason = e instanceof ApiError && e.status === 401 && await candidate.tokenIsValid().catch(() => false)
				? `the token is valid but is missing permissions. Create a new one with ${REQUIRED_PERMISSIONS}`
				: errorText(e)
			const choice = await vscode.window.showErrorMessage(
				`Zenitrox: could not sign in to ${candidate.baseUrl}: ${reason}.`,
				'Open API Tokens',
				'Sign In',
			)
			if (choice === 'Open API Tokens') vscode.env.openExternal(vscode.Uri.parse(candidate.apiTokensUrl()))
			if (choice === 'Sign In') vscode.commands.executeCommand('zenitrox.signIn')
			return false
		}
		client = candidate
		accountView.setAccount(displayName(me))
		await vscode.commands.executeCommand('setContext', 'zenitrox.signedIn', true)
		restartTimer()
		await refresh()
		return true
	}

	async function signOut() {
		await context.secrets.delete(TOKEN_KEY)
		client = undefined
		me = undefined
		if (refreshTimer) clearInterval(refreshTimer)
		view.clear()
		treeView.message = undefined
		treeView.badge = undefined
		accountView.setAccount(undefined)
		setStatus(undefined)
		await vscode.commands.executeCommand('setContext', 'zenitrox.signedIn', false)
	}

	/** Runs a task change, showing progress on the task list. */
	async function changeTask(node: TaskNode | undefined, changes: Partial<Task>, done: (task: Task) => void) {
		if (!client || !node) return
		await vscode.window.withProgress({location: {viewId: 'zenitrox.myTasks'}}, async () => {
			try {
				done(await client!.updateTask(node.task.id, changes))
			} catch (e) {
				vscode.window.showErrorMessage(`Zenitrox: could not update "${node.task.title}" (${errorText(e)}).`)
			}
		})
	}

	context.subscriptions.push(
		vscode.commands.registerCommand('zenitrox.signIn', async () => {
			const config = vscode.workspace.getConfiguration('zenitrox')
			const url = await vscode.window.showInputBox({
				title: 'Zenitrox: server address',
				value: config.get<string>('url', ''),
				prompt: 'The address you open Zenitrox at in the browser.',
				ignoreFocusOut: true,
				validateInput: value => /^https?:\/\/\S+$/.test(value.trim()) ? undefined : 'Enter an address starting with https://',
			})
			if (url === undefined) return
			await config.update('url', normalizeBaseUrl(url), vscode.ConfigurationTarget.Global)

			const method = await vscode.window.showQuickPick([
				{label: '$(account) Username and password', description: 'recommended', value: 'password'},
				{label: '$(key) API token', description: 'for accounts that sign in with Google', value: 'token'},
			], {title: 'Zenitrox: how do you want to sign in?', ignoreFocusOut: true})
			if (!method) return

			const token = method.value === 'password'
				? await tokenFromPassword(normalizeBaseUrl(url))
				: (await vscode.window.showInputBox({
					title: 'Zenitrox: API token',
					prompt: `Create one in Zenitrox under Settings → API tokens with ${REQUIRED_PERMISSIONS}.`,
					password: true,
					ignoreFocusOut: true,
					validateInput: value => value.trim() ? undefined : 'Paste your API token',
				}))?.trim()
			if (!token) return
			if (await connect(token)) {
				await context.secrets.store(TOKEN_KEY, token)
				vscode.window.showInformationMessage(`Zenitrox: signed in as ${displayName(me)}.`)
			}
		}),
		vscode.commands.registerCommand('zenitrox.signOut', signOut),
		vscode.commands.registerCommand('zenitrox.refresh', refresh),
		vscode.commands.registerCommand('zenitrox.focus', () => vscode.commands.executeCommand('zenitrox.myTasks.focus')),
		vscode.commands.registerCommand('zenitrox.openApp', () => {
			if (client) vscode.env.openExternal(vscode.Uri.parse(client.baseUrl))
		}),
		vscode.commands.registerCommand('zenitrox.openTask', (node?: TaskNode) => {
			if (client && node) vscode.env.openExternal(vscode.Uri.parse(client.taskUrl(node.task.id)))
		}),
		vscode.commands.registerCommand('zenitrox.markDone', (node?: TaskNode) =>
			changeTask(node, {done: true}, task => {
				view.remove(task.id)
				refresh()
				vscode.window.showInformationMessage(`✅ Done: ${task.title}`, 'Undo').then(choice => {
					if (choice === 'Undo') changeTask({kind: 'task', task}, {done: false}, () => refresh())
				})
			})),
		vscode.commands.registerCommand('zenitrox.setProgress', async (node?: TaskNode) => {
			if (!node) return
			const current = Math.round((node.task.percent_done ?? 0) * 100)
			const picked = await vscode.window.showQuickPick(
				[0, 25, 50, 75, 100].map(value => ({
					label: `${value}%`,
					description: value === current ? 'current' : undefined,
					value,
				})),
				{title: `Progress of "${node.task.title}"`},
			)
			if (!picked || picked.value === current) return
			await changeTask(node, {percent_done: picked.value / 100}, task => view.replace(task))
		}),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('zenitrox.refreshMinutes') && client) restartTimer()
		}),
		vscode.window.onDidChangeWindowState(state => {
			if (state.focused && client) refresh()
		}),
		{dispose: () => refreshTimer && clearInterval(refreshTimer)},
	)

	const savedToken = await context.secrets.get(TOKEN_KEY)
	await vscode.commands.executeCommand('setContext', 'zenitrox.signedIn', Boolean(savedToken))
	if (savedToken) {
		await connect(savedToken)
	}
}

/**
 * Asks for username, password and (when the account has 2FA) a passcode, and
 * trades them for a new API token. Returns undefined when cancelled or failed.
 */
async function tokenFromPassword(baseUrl: string): Promise<string | undefined> {
	const username = (await vscode.window.showInputBox({
		title: 'Zenitrox: username or email',
		ignoreFocusOut: true,
		validateInput: value => value.trim() ? undefined : 'Enter your username',
	}))?.trim()
	if (!username) return
	const password = await vscode.window.showInputBox({
		title: `Zenitrox: password for ${username}`,
		prompt: 'Only used once to create an access token for this editor. It is not saved.',
		password: true,
		ignoreFocusOut: true,
		validateInput: value => value ? undefined : 'Enter your password',
	})
	if (!password) return

	const tokenTitle = `${vscode.env.appName} on ${os.hostname()}`
	let totpPasscode: string | undefined
	for (;;) {
		try {
			return await vscode.window.withProgress(
				{location: vscode.ProgressLocation.Notification, title: 'Zenitrox: signing in…'},
				() => createTokenWithPassword(baseUrl, {username, password, totpPasscode, tokenTitle}),
			)
		} catch (e) {
			if (e instanceof ApiError && e.code === ERR_TOTP_PASSCODE) {
				totpPasscode = (await vscode.window.showInputBox({
					title: 'Zenitrox: two-factor code',
					prompt: totpPasscode ? 'That code did not work. Enter the current code from your authenticator app.' : 'Enter the code from your authenticator app.',
					ignoreFocusOut: true,
					validateInput: value => /^\d{6}$/.test(value.trim()) ? undefined : 'Enter the 6-digit code',
				}))?.trim()
				if (!totpPasscode) return
				continue
			}
			const reason = e instanceof ApiError && e.status === 403 ? 'wrong username or password' : errorText(e)
			const choice = await vscode.window.showErrorMessage(`Zenitrox: could not sign in (${reason}).`, 'Try Again')
			if (choice) vscode.commands.executeCommand('zenitrox.signIn')
			return
		}
	}
}

/** "Ram V. (@ram)" when a display name is set, otherwise "@ram". */
function displayName(user: User | undefined): string {
	if (!user) return ''
	return user.name && user.name !== user.username ? `${user.name} (@${user.username})` : `@${user.username}`
}

export function deactivate() {
	if (refreshTimer) clearInterval(refreshTimer)
}

function errorText(e: unknown): string {
	if (e instanceof ApiError && e.status === 401) return 'the API token is invalid or expired'
	if (e instanceof ApiError && e.status === 403) return 'the API token is missing a permission'
	if (e instanceof Error && e.name === 'TimeoutError') return 'the server did not answer in time'
	return e instanceof Error ? e.message : String(e)
}
