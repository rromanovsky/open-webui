/** Face → Project API helpers. Same origin env as Concierge (`AECP_API_BASE_URL`). */

export const AECP_API_BASE_DEFAULT = 'http://127.0.0.1:3000';
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
