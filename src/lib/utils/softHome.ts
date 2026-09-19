/** Soft default home for the AECP workbench fork. Chat deep-links stay intact. */

export const AECP_OWUI_LAST_SURFACE_KEY = 'aecp.owui.lastSurface';
export const AECP_OWUI_STAY_ON_CHAT_KEY = 'aecp.owui.stayOnChat';

export type OwuiSurface = 'dashboard' | 'chat';

export type SoftHomeInput = {
	pathname: string;
	search?: string;
	lastSurface?: string | null;
	stayOnChat?: boolean;
};

/** Query keys that mean the root chat composer/session should load, not Dashboard. */
const CHAT_INTENT_PARAMS = [
	'q',
	'models',
	'model',
	'youtube',
	'load-url',
	'web-search',
	'image-generation',
	'code-interpreter',
	'tools',
	'tool-ids',
	'call',
	'temporary-chat'
] as const;

export function normalizePathname(pathname: string): string {
	if (!pathname || pathname === '/') return '/';
	const trimmed = pathname.replace(/\/+$/, '');
	return trimmed.length === 0 ? '/' : trimmed;
}

export function hasChatIntentQuery(search: string | undefined): boolean {
	const raw = search ?? '';
	const params = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);
	return CHAT_INTENT_PARAMS.some((key) => params.has(key));
}

/**
 * Cold `/` → `/dashboard`. Never steals `/c/...`, `/s/...`, workspace, admin, auth.
 * `stayOnChat` covers New Chat. `lastSurface === 'chat'` keeps refresh on `/` on chat.
 */
export function shouldSoftRedirectToDashboard(input: SoftHomeInput): boolean {
	if (normalizePathname(input.pathname) !== '/') return false;
	if (hasChatIntentQuery(input.search)) return false;
	if (input.stayOnChat) return false;
	if (input.lastSurface === 'chat') return false;
	return true;
}

function browserStorage(kind: 'local' | 'session'): Storage | undefined {
	if (typeof window === 'undefined') return undefined;
	return kind === 'local' ? window.localStorage : window.sessionStorage;
}

export function rememberLastSurface(
	surface: OwuiSurface,
	storage: Storage | undefined = browserStorage('local')
): void {
	try {
		storage?.setItem(AECP_OWUI_LAST_SURFACE_KEY, surface);
	} catch {
		// private mode / quota — fail open
	}
}

export function readLastSurface(
	storage: Storage | undefined = browserStorage('local')
): string | null {
	try {
		return storage?.getItem(AECP_OWUI_LAST_SURFACE_KEY) ?? null;
	} catch {
		return null;
	}
}

export function markStayOnChat(
	storage: Storage | undefined = browserStorage('session')
): void {
	try {
		storage?.setItem(AECP_OWUI_STAY_ON_CHAT_KEY, '1');
	} catch {
		// fail open
	}
}

export function readStayOnChat(
	storage: Storage | undefined = browserStorage('session')
): boolean {
	try {
		return storage?.getItem(AECP_OWUI_STAY_ON_CHAT_KEY) === '1';
	} catch {
		return false;
	}
}

export function clearStayOnChat(
	storage: Storage | undefined = browserStorage('session')
): void {
	try {
		storage?.removeItem(AECP_OWUI_STAY_ON_CHAT_KEY);
	} catch {
		// fail open
	}
}

/** New Chat / model-picker flows that land on `/` must call this before `goto('/')`. */
export function enterChatSurface(): void {
	markStayOnChat();
	rememberLastSurface('chat');
}

export function enterDashboardSurface(): void {
	clearStayOnChat();
	rememberLastSurface('dashboard');
}
