// The tools shown on the Tools page. To add or change a tool, edit this list.
// Files offered for download live in frontend/public/downloads/.

import type {IconProp} from '@fortawesome/fontawesome-svg-core'

export type ToolAction = {
	label: string
	href: string
	icon: IconProp
	/** Set for files: the browser saves the link instead of opening it. */
	download?: boolean
}

export type Tool = {
	id: string
	name: string
	icon: IconProp
	summary: string
	actions: ToolAction[]
	sections: {title: string, steps: string[]}[]
}

const SERVER = 'https://zenitroxteam.onrender.com'

// Paste the team group's invite link (Telegram → group → Invite links) to show a "Join team group" button.
const TELEGRAM_GROUP_INVITE: string = ''

export const TOOLS: Tool[] = [
	{
		id: 'vscode',
		name: 'VS Code & Antigravity extension',
		icon: 'code',
		summary: 'See the tasks assigned to you inside VS Code or Antigravity, mark them done and update their progress without leaving the editor.',
		actions: [
			{label: 'Download zenitrox.vsix', href: '/downloads/zenitrox.vsix', icon: 'download', download: true},
		],
		sections: [
			{
				title: 'Install',
				steps: [
					'Download zenitrox.vsix with the button above.',
					'In the editor open the Extensions view, click ⋯ → Install from VSIX… and pick the file.',
					'Reload the window if you are updating an older version (Ctrl+Shift+P → Developer: Reload Window).',
				],
			},
			{
				title: 'Sign in',
				steps: [
					'Click the Zenitrox icon in the left bar → Sign in.',
					`Keep the address ${SERVER}.`,
					'Choose Username and password and log in with your Zenitrox account (and your 2FA code, if you use one).',
				],
			},
			{
				title: 'Use',
				steps: [
					'Your open tasks are grouped into Overdue, Today, Next 7 days, Later and No due date.',
					'Hover a task for the Mark done, Set progress and Open in browser buttons.',
					'The status bar shows how many tasks are overdue or due today; click it to open the list.',
				],
			},
		],
	},
	{
		id: 'telegram',
		name: 'Telegram alerts bot',
		icon: 'bell',
		summary: 'Get Zenitrox alerts on your phone: new assignments, comments on your tasks, reminders, overdue tasks and a morning summary at 8:00 (Monday to Saturday).',
		actions: [
			{label: 'Open @zenitrox_alerts_bot', href: 'https://t.me/zenitrox_alerts_bot', icon: 'arrow-up-right-from-square'},
			...(TELEGRAM_GROUP_INVITE
				? [{label: 'Join team group', href: TELEGRAM_GROUP_INVITE, icon: 'users'} satisfies ToolAction]
				: []),
		],
		sections: [
			{
				title: 'Set up',
				steps: [
					'Open the bot with the button above and press Start.',
					'Send /link followed by your Zenitrox username, for example: /link ravi',
				],
			},
			{
				title: 'Commands',
				steps: [
					'/today – your tasks due today and overdue',
					'/unlink – stop personal alerts',
				],
			},
			{
				title: 'Team group',
				steps: [
					'New tasks, completed tasks and comments from everyone are posted in the team Telegram group.',
				],
			},
		],
	},
]
