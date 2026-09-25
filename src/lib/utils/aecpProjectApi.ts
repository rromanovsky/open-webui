/** Face → Project API helpers. Same origin env as Concierge (`AECP_API_BASE_URL`). */

export const AECP_API_BASE_DEFAULT = 'http://127.0.0.1:3010';
export const AECP_API_BASE_STORAGE_KEY = 'aecp.apiBaseUrl';
export const DOCKER_DESKTOP_HOST = 'host.docker.internal';

export type AecpApiBaseInput = {
	queryBase?: string | null;
	storedBase?: string | null;
	envBase?: string | null;
};

export function rewriteDockerDesktopHost(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.hostname.toLowerCase() === DOCKER_DESKTOP_HOST) {
			parsed.hostname = '127.0.0.1';
		}
		return parsed.toString().replace(/\/+$/, '');
	} catch {
		return url.replace(/\/\/host\.docker\.internal(?=[:/]|$)/i, '//127.0.0.1').replace(/\/+$/, '');
	}
}

export function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
	for (const value of values) {
		if (typeof value === 'string' && value.trim().length > 0) {
			return value.trim();
		}
	}
	return null;
}

/** Browser Face uses loopback by default. Do not rewrite `host.docker.internal` here — Compose/contour browsers can resolve it; native Face defaults to 127.0.0.1. */
export function resolveAecpApiBaseUrl(input: AecpApiBaseInput = {}): string {
	const raw =
		firstNonEmpty(input.queryBase, input.storedBase, input.envBase) ?? AECP_API_BASE_DEFAULT;
	return raw.replace(/\/+$/, '');
}

export function joinAecpApiUrl(base: string, path: string): string {
	const origin = base.replace(/\/+$/, '');
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${origin}${suffix}`;
}

export function dashboardIndexPath(projectId?: string | null): string {
	if (projectId && projectId.length > 0) {
		return `/api/v1/dashboard?projectId=${encodeURIComponent(projectId)}`;
	}
	return '/api/v1/dashboard';
}

export function taskLiveChainPath(taskId: string): string {
	return `/api/v1/tasks/${taskId}/live-chain`;
}

export function projectTasksPath(projectId: string): string {
	return `/api/v1/projects/${projectId}/tasks`;
}

/** Dogfood cadence for layer A + B10. Hidden tabs do not poll. */
export const DASHBOARD_POLL_MS = 5_000;

/** Switcher window. The focused Task is kept even when it falls outside this cap. */
export const DASHBOARD_RECENT_TASK_LIMIT = 40;

export function isDashboardTabHidden(visibilityState: string): boolean {
	return visibilityState === 'hidden';
}

export function resultPath(resultId: string): string {
	return `/api/v1/results/${resultId}`;
}

export function runPath(runId: string): string {
	return `/api/v1/runs/${runId}`;
}

export function readStoredAecpApiBase(storage?: Storage | null): string | null {
	try {
		return storage?.getItem(AECP_API_BASE_STORAGE_KEY) ?? null;
	} catch {
		return null;
	}
}

export type DashboardSearch = {
	taskId: string | null;
	projectId: string | null;
	apiBase: string | null;
};

export function parseDashboardSearch(search: string): DashboardSearch {
	const raw = search.startsWith('?') ? search.slice(1) : search;
	const params = new URLSearchParams(raw);
	return {
		taskId: firstNonEmpty(params.get('taskId')),
		projectId: firstNonEmpty(params.get('projectId')),
		apiBase: firstNonEmpty(params.get('apiBase'))
	};
}

/**
 * `pinnedTaskId` wins: `history.replaceState` does not update the SvelteKit page store,
 * so a switcher pick must override a stale `?taskId=`. Else the URL query, else `focusTask`.
 */
export function resolveDashboardTaskId(input: {
	queryTaskId: string | null;
	pinnedTaskId?: string | null;
	focusTaskId?: string | null;
}): string | null {
	return firstNonEmpty(input.pinnedTaskId, input.queryTaskId, input.focusTaskId);
}

/** Pin the default focus Task once, so a later poll does not retarget the strip. */
export function focusTaskIdToPin(input: {
	queryTaskId: string | null;
	pinnedTaskId?: string | null;
	focusTaskId: string | null;
}): string | null {
	if (input.pinnedTaskId) return null;
	if (input.queryTaskId) return null;
	return firstNonEmpty(input.focusTaskId);
}

export type DashboardTaskOption = {
	id: string;
	key: string;
	title: string;
	status: string;
	updatedAt: string;
};

export function dashboardTaskLabel(
	task: Pick<DashboardTaskOption, 'key' | 'title' | 'status'>
): string {
	return `${task.key} · ${task.title} · ${task.status}`;
}

/** Newest `updatedAt` first. Stable key order when timestamps tie. */
export function recentDashboardTasks(
	tasks: DashboardTaskOption[],
	options?: { limit?: number; includeId?: string | null }
): DashboardTaskOption[] {
	const limit = options?.limit ?? DASHBOARD_RECENT_TASK_LIMIT;
	const sorted = [...tasks].sort((a, b) => {
		if (a.updatedAt !== b.updatedAt) return a.updatedAt < b.updatedAt ? 1 : -1;
		if (a.key !== b.key) return a.key < b.key ? -1 : 1;
		return 0;
	});
	const recent = sorted.slice(0, Math.max(0, limit));
	const includeId = options?.includeId;
	if (includeId && !recent.some((task) => task.id === includeId)) {
		const extra = sorted.find((task) => task.id === includeId);
		if (extra) recent.push(extra);
	}
	return recent;
}

/** Shareable `?taskId=` without a full navigation. Preserves other query keys. */
export function withDashboardTaskId(href: string, taskId: string): string {
	const url = new URL(href, 'http://dashboard.local');
	url.searchParams.set('taskId', taskId);
	return `${url.pathname}${url.search}${url.hash}`;
}

export type AecpFetchResult<T> =
	| { ok: true; status: number; data: T }
	| { ok: false; status: number; error: string };

export async function fetchAecpJson<T>(
	url: string,
	fetchImpl: typeof fetch = fetch
): Promise<AecpFetchResult<T>> {
	try {
		const response = await fetchImpl(url, { method: 'GET' });
		if (!response.ok) {
			return {
				ok: false,
				status: response.status,
				error: response.status === 404 ? 'Not found' : `HTTP ${String(response.status)}`
			};
		}
		return { ok: true, status: response.status, data: (await response.json()) as T };
	} catch (error) {
		return {
			ok: false,
			status: 0,
			error: error instanceof Error ? error.message : 'Project API unreachable'
		};
	}
}
