// Small client for the Zenitrox (Vikunja) v2 API, authenticated with a
// personal API token.

export type User = {
	id: number
	username: string
	name?: string
}

export type Task = {
	id: number
	title: string
	project_id: number
	done: boolean
	due_date?: string | null
	priority?: number
	percent_done?: number
	identifier?: string
	assignees?: User[] | null
	[key: string]: unknown
}

export type Project = {
	id: number
	title: string
}

type Page<T> = {
	items: T[] | null
	total_pages: number
}

export class ApiError extends Error {
	constructor(message: string, readonly status: number, readonly code?: number) {
		super(message)
	}
}

/** Server error code when an account has 2FA and no or a wrong passcode was sent. */
export const ERR_TOTP_PASSCODE = 1017

const PER_PAGE = 50
const TIMEOUT_MS = 60_000 // free hosting can take a while to wake up
const TOKEN_LIFETIME_DAYS = 365

export function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, '').replace(/\/api\/v[12]$/, '')
}

async function call<T>(url: string, method: string, token: string | undefined, body?: unknown): Promise<T> {
	const response = await fetch(url, {
		method,
		headers: {
			...(token ? {'Authorization': `Bearer ${token}`} : {}),
			'Accept': 'application/json',
			...(body === undefined ? {} : {'Content-Type': 'application/json'}),
		},
		body: body === undefined ? undefined : JSON.stringify(body),
		signal: AbortSignal.timeout(TIMEOUT_MS),
	})
	if (!response.ok) {
		let detail = response.statusText
		let code: number | undefined
		try {
			const problem = await response.json() as {detail?: string, title?: string, message?: string, code?: number}
			detail = problem.detail || problem.message || problem.title || detail
			code = problem.code
		} catch {
			// keep the status text
		}
		throw new ApiError(`${response.status} ${detail}`, response.status, code)
	}
	return await response.json() as T
}

export type PasswordSignIn = {
	username: string
	password: string
	totpPasscode?: string
	tokenTitle: string
}

/**
 * Logs in with a username and password, creates an API token with exactly
 * the permissions the extension needs, then ends the login session again.
 * Returns the new API token; the password is not kept.
 */
export async function createTokenWithPassword(baseUrl: string, signIn: PasswordSignIn): Promise<string> {
	const base = normalizeBaseUrl(baseUrl)
	const {token: session} = await call<{token: string}>(`${base}/api/v2/login`, 'POST', undefined, {
		username: signIn.username,
		password: signIn.password,
		totp_passcode: signIn.totpPasscode,
		long_token: false,
	})
	try {
		// Grant every task route this server knows, so new ones keep working.
		const routes = await call<Record<string, Record<string, unknown>>>(`${base}/api/v1/routes`, 'GET', session)
			.catch(() => ({} as Record<string, Record<string, unknown>>))
		const taskRoutes = Object.keys(routes.tasks ?? {})
		const expires = new Date(Date.now() + TOKEN_LIFETIME_DAYS * 24 * 60 * 60 * 1000)
		const created = await call<{token: string}>(`${base}/api/v2/tokens`, 'POST', session, {
			title: signIn.tokenTitle,
			expires_at: expires.toISOString(),
			permissions: {
				tasks: taskRoutes.length > 0 ? taskRoutes : ['read_all', 'read_one', 'update'],
				projects: ['read_all'],
				other: ['user'],
			},
		})
		return created.token
	} finally {
		await call(`${base}/api/v2/logout`, 'POST', session).catch(() => undefined)
	}
}

export class ZenitroxClient {
	readonly baseUrl: string

	constructor(baseUrl: string, private readonly token: string) {
		this.baseUrl = normalizeBaseUrl(baseUrl)
	}

	taskUrl(taskId: number): string {
		return `${this.baseUrl}/tasks/${taskId}`
	}

	private request<T>(method: string, path: string, body?: unknown): Promise<T> {
		return call<T>(`${this.baseUrl}/api/v2${path}`, method, this.token, body)
	}

	private async all<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
		const items: T[] = []
		for (let page = 1; ; page++) {
			const query = new URLSearchParams({...params, page: String(page), per_page: String(PER_PAGE)})
			const result = await this.request<Page<T>>('GET', `${path}?${query}`)
			items.push(...(result.items ?? []))
			if (page >= result.total_pages) {
				return items
			}
		}
	}

	apiTokensUrl(): string {
		return `${this.baseUrl}/user/settings/api-tokens`
	}

	/**
	 * Whether the token itself is valid. The server answers 401 both for a bad
	 * token and for a valid one that lacks a route's permission; this endpoint
	 * skips the permission check, so it tells the two apart.
	 */
	async tokenIsValid(): Promise<boolean> {
		try {
			await this.request('GET', '/token/test')
			return true
		} catch (e) {
			if (e instanceof ApiError && e.status === 401) return false
			throw e
		}
	}

	currentUser(): Promise<User> {
		return this.request<User>('GET', '/user')
	}

	myOpenTasks(username: string): Promise<Task[]> {
		return this.all<Task>('/tasks', {
			filter: `done = false && assignees in ${username}`,
			sort_by: 'due_date',
			order_by: 'asc',
		})
	}

	projects(): Promise<Project[]> {
		return this.all<Project>('/projects')
	}

	/**
	 * Changes some fields of a task. The update endpoint replaces the whole
	 * task (fields left out are cleared), so the current task is loaded first.
	 */
	async updateTask(taskId: number, changes: Partial<Task>): Promise<Task> {
		const {$schema: _schema, ...current} = await this.request<Task & {$schema?: string}>('GET', `/tasks/${taskId}`)
		return this.request<Task>('PUT', `/tasks/${taskId}`, {...current, ...changes})
	}
}
