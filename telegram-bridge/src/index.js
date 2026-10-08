// Zenitrox → Telegram bridge (Cloudflare Worker)
//
// POST /zenitrox   Zenitrox webhooks (project and user webhooks), signed with WEBHOOK_SECRET
// POST /telegram   Telegram bot updates (/start, /link, /unlink, /today, /chatid)
// Cron             Morning digest: personal summaries and a team summary
//
// Secrets: TELEGRAM_BOT_TOKEN, WEBHOOK_SECRET, TELEGRAM_SECRET,
//          ZENITROX_API_TOKEN (optional, enables digests; needs "tasks: read all")
// Vars:    ZENITROX_URL, TEAM_CHAT_ID (optional), TIMEZONE
// KV:      LINKS  (user:<username> → chat id, chat:<chat id> → username)

export default {
	async fetch(request, env) {
		const url = new URL(request.url)
		if (request.method !== 'POST') {
			return new Response('Zenitrox Telegram bridge is running.')
		}
		if (url.pathname === '/zenitrox') return handleZenitrox(request, env)
		if (url.pathname === '/telegram') return handleTelegram(request, env)
		return new Response('Not found', {status: 404})
	},

	async scheduled(_controller, env, ctx) {
		ctx.waitUntil(sendDailyDigest(env))
	},
}

// ---------- Zenitrox webhooks ----------

async function handleZenitrox(request, env) {
	const body = await request.text()
	const signature = request.headers.get('X-Vikunja-Signature') || ''
	if (!(await validSignature(body, signature, env.WEBHOOK_SECRET))) {
		return new Response('Invalid signature', {status: 401})
	}

	const {event_name: event, time, data} = JSON.parse(body)
	const task = data.task
	const doer = data.doer
	const link = task ? `${env.ZENITROX_URL.replace(/\/$/, '')}/tasks/${task.id}` : ''
	const title = task ? `<a href="${link}">${esc(task.title)}</a>` : ''
	const due = task ? formatDue(task.due_date, env) : ''
	const who = (u) => esc(u?.name || u?.username || 'Someone')

	const team = [] // messages for the team group
	const direct = [] // [username, message] pairs

	switch (event) {
		case 'task.created':
			team.push(`🆕 ${who(doer)} created ${title}${due}`)
			break

		case 'task.assignee.created':
			team.push(`👤 ${who(doer)} assigned ${who(data.assignee)} to ${title}${due}`)
			if (data.assignee?.username !== doer?.username) {
				direct.push([data.assignee?.username, `👤 ${who(doer)} assigned you: ${title}${due}`])
			}
			break

		case 'task.comment.created': {
			const text = esc(truncate(stripHtml(data.comment?.comment || ''), 300))
			team.push(`💬 ${who(doer)} on ${title}:\n${text}`)
			for (const a of task.assignees || []) {
				if (a.username !== doer?.username) {
					direct.push([a.username, `💬 ${who(doer)} commented on your task ${title}:\n${text}`])
				}
			}
			break
		}

		case 'task.updated':
			// Updates fire for every edit; only announce a task that was just completed.
			if (task.done && justHappened(task.done_at, time)) {
				team.push(`✅ ${who(doer)} completed ${title}`)
			}
			break

		case 'task.reminder.fired':
			direct.push([data.user?.username, `⏰ Reminder: ${title}${due}`])
			break

		case 'task.overdue':
			direct.push([data.user?.username, `🔴 Overdue: ${title}${due}`])
			break

		case 'tasks.overdue': {
			const lines = (data.tasks || []).map(t =>
				`• <a href="${env.ZENITROX_URL.replace(/\/$/, '')}/tasks/${t.id}">${esc(t.title)}</a>${formatDue(t.due_date, env)}`)
			if (lines.length) {
				direct.push([data.user?.username, `🔴 You have ${lines.length} overdue task(s):\n${lines.join('\n')}`])
			}
			break
		}
	}

	if (env.TEAM_CHAT_ID) {
		for (const m of team) await sendMessage(env, env.TEAM_CHAT_ID, m)
	}
	for (const [username, m] of direct) {
		if (!username) continue
		const chatId = await env.LINKS.get(`user:${username.toLowerCase()}`)
		if (chatId) await sendMessage(env, chatId, m)
	}
	return new Response('ok')
}

async function validSignature(body, signature, secret) {
	if (!secret || !signature) return false
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
		{name: 'HMAC', hash: 'SHA-256'}, false, ['sign'])
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
	const expected = [...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')
	return timingSafeEqual(expected, signature.toLowerCase())
}

function timingSafeEqual(a, b) {
	if (a.length !== b.length) return false
	let diff = 0
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
	return diff === 0
}

// ---------- Telegram bot commands ----------

async function handleTelegram(request, env) {
	if (request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.TELEGRAM_SECRET) {
		return new Response('Forbidden', {status: 403})
	}
	const update = await request.json()
	const msg = update.message
	if (!msg?.text) return new Response('ok')

	const chatId = String(msg.chat.id)
	const [command, arg] = msg.text.trim().split(/\s+/, 2)
	const cmd = command.split('@')[0].toLowerCase()

	if (cmd === '/start' || cmd === '/help') {
		await sendMessage(env, chatId,
			'👋 Hi! I send Zenitrox task alerts.\n\n' +
			'To get your personal alerts here, send:\n<code>/link your-zenitrox-username</code>\n\n' +
			'/today shows your tasks for today.\n/unlink stops personal alerts.\n/chatid shows this chat\'s id.')
	} else if (cmd === '/link') {
		if (msg.chat.type !== 'private') {
			await sendMessage(env, chatId, 'Please send /link to me in a private chat.')
		} else if (!arg) {
			await sendMessage(env, chatId, 'Usage: <code>/link your-zenitrox-username</code>')
		} else {
			await env.LINKS.put(`user:${arg.toLowerCase()}`, chatId)
			await env.LINKS.put(`chat:${chatId}`, arg.toLowerCase())
			await sendMessage(env, chatId, `✅ Linked to Zenitrox user <b>${esc(arg)}</b>. You'll get your task alerts here.`)
		}
	} else if (cmd === '/unlink') {
		if (arg) {
			const linked = await env.LINKS.get(`user:${arg.toLowerCase()}`)
			if (linked === chatId) {
				await env.LINKS.delete(`user:${arg.toLowerCase()}`)
				await env.LINKS.delete(`chat:${chatId}`)
			}
		}
		await sendMessage(env, chatId, arg ? 'Unlinked.' : 'Usage: <code>/unlink your-zenitrox-username</code>')
	} else if (cmd === '/today') {
		const username = await env.LINKS.get(`chat:${chatId}`)
		if (!username) {
			await sendMessage(env, chatId, 'Link your account first: <code>/link your-zenitrox-username</code>')
		} else if (!env.ZENITROX_API_TOKEN) {
			await sendMessage(env, chatId, 'Daily summaries are not set up yet.')
		} else {
			const digest = buildDigest(await fetchOpenTasks(env), env)
			const mine = digest.byUser.get(username)
			await sendMessage(env, chatId, mine ? personalDigest(mine, env) : '🎉 Nothing due today or overdue. Enjoy!')
		}
	} else if (cmd === '/chatid') {
		await sendMessage(env, chatId, `This chat's id is <code>${chatId}</code>`)
	}
	return new Response('ok')
}

// ---------- Daily digest ----------

const UPCOMING_DAYS = 3

async function sendDailyDigest(env) {
	if (!env.ZENITROX_API_TOKEN) return
	const digest = buildDigest(await fetchOpenTasks(env), env)

	for (const [username, entry] of digest.byUser) {
		const chatId = await env.LINKS.get(`user:${username}`)
		if (chatId) await sendMessage(env, chatId, personalDigest(entry, env))
	}

	if (env.TEAM_CHAT_ID) {
		await sendMessage(env, env.TEAM_CHAT_ID, teamDigest(digest, env))
	}
}

async function fetchOpenTasks(env) {
	const base = env.ZENITROX_URL.replace(/\/$/, '')
	const tasks = []
	for (let page = 1; ; page++) {
		const params = new URLSearchParams({
			filter: 'done = false',
			filter_timezone: env.TIMEZONE || 'Asia/Kolkata',
			sort_by: 'due_date',
			order_by: 'asc',
			per_page: '250',
			page: String(page),
		})
		const res = await fetch(`${base}/api/v1/tasks?${params}`, {
			headers: {Authorization: `Bearer ${env.ZENITROX_API_TOKEN}`},
		})
		if (!res.ok) throw new Error(`Zenitrox API ${res.status}: ${await res.text()}`)
		tasks.push(...(await res.json() ?? []))
		const totalPages = Number(res.headers.get('x-pagination-total-pages') || 1)
		if (page >= totalPages) return tasks
	}
}

// Groups open tasks into overdue, due today and due soon, per assignee and for the team.
function buildDigest(tasks, env) {
	const now = new Date()
	const today = localDay(now, env)
	const soonEnd = localDay(new Date(now.getTime() + UPCOMING_DAYS * 86400000), env)
	const byUser = new Map()
	const team = {overdue: 0, today: 0, soon: 0}

	for (const task of tasks) {
		if (!task.due_date || task.due_date.startsWith('0001-')) continue
		const due = new Date(task.due_date)
		const day = localDay(due, env)
		let bucket = null
		if (due < now) bucket = 'overdue'
		else if (day === today) bucket = 'today'
		else if (day <= soonEnd) bucket = 'soon'
		if (!bucket) continue

		team[bucket]++
		for (const a of task.assignees || []) {
			const key = a.username.toLowerCase()
			if (!byUser.has(key)) byUser.set(key, {user: a, overdue: [], today: [], soon: []})
			byUser.get(key)[bucket].push(task)
		}
	}
	return {byUser, team}
}

function personalDigest(entry, env) {
	const name = esc(entry.user.name || entry.user.username)
	const parts = [`☀️ Good morning, ${name}!`]
	const section = (icon, label, list) => {
		if (list.length === 0) return
		// Telegram caps a message at 4096 characters.
		const shown = list.slice(0, 15).map(t => `• ${taskLink(t, env)}${formatDue(t.due_date, env)}`)
		if (list.length > shown.length) shown.push(`…and ${list.length - shown.length} more`)
		parts.push(`\n${icon} <b>${label} (${list.length})</b>\n` + shown.join('\n'))
	}
	section('🔴', 'Overdue', entry.overdue)
	section('📌', 'Due today', entry.today)
	section('🗓', `Next ${UPCOMING_DAYS} days`, entry.soon)
	if (parts.length === 1) parts.push('\n🎉 Nothing due today or overdue.')
	return parts.join('\n')
}

function teamDigest(digest, env) {
	const date = new Date().toLocaleDateString('en-IN', {timeZone: env.TIMEZONE || 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'short'})
	const lines = [`☀️ <b>Team summary — ${date}</b>`,
		`🔴 Overdue: ${digest.team.overdue} · 📌 Due today: ${digest.team.today} · 🗓 Next ${UPCOMING_DAYS} days: ${digest.team.soon}`]
	const people = [...digest.byUser.values()]
		.filter(e => e.overdue.length || e.today.length)
		.sort((a, b) => (b.overdue.length - a.overdue.length) || (b.today.length - a.today.length))
	if (people.length) {
		lines.push('')
		for (const e of people) {
			const bits = []
			if (e.overdue.length) bits.push(`${e.overdue.length} overdue`)
			if (e.today.length) bits.push(`${e.today.length} due today`)
			lines.push(`• ${esc(e.user.name || e.user.username)}: ${bits.join(', ')}`)
		}
	}
	lines.push(`\n<a href="${env.ZENITROX_URL.replace(/\/$/, '')}/dashboard">Open team dashboard</a>`)
	return lines.join('\n')
}

function localDay(date, env) {
	// en-CA formats as YYYY-MM-DD, which sorts and compares as a string.
	return date.toLocaleDateString('en-CA', {timeZone: env.TIMEZONE || 'Asia/Kolkata'})
}

function taskLink(task, env) {
	return `<a href="${env.ZENITROX_URL.replace(/\/$/, '')}/tasks/${task.id}">${esc(task.title)}</a>`
}

// ---------- Helpers ----------

async function sendMessage(env, chatId, text) {
	const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true}),
	})
	if (!res.ok) console.log('Telegram error', res.status, await res.text())
}

function formatDue(dueDate, env) {
	if (!dueDate || dueDate.startsWith('0001-')) return ''
	const d = new Date(dueDate)
	const text = d.toLocaleString('en-IN', {
		timeZone: env.TIMEZONE || 'Asia/Kolkata',
		day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
	})
	return ` — due <b>${text}</b>`
}

function justHappened(doneAt, eventTime) {
	if (!doneAt || doneAt.startsWith('0001-')) return false
	return Math.abs(new Date(eventTime) - new Date(doneAt)) < 2 * 60 * 1000
}

function stripHtml(html) {
	return html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '')
		.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
}

function truncate(s, n) {
	return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function esc(s) {
	return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
