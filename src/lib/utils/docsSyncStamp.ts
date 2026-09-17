/** Parse AECP docs Knowledge description / stamp written by tools/open-webui/sync-workbench.mjs */

export const AECP_DOCS_KNOWLEDGE_NAME = 'AECP docs';

const LAST_SYNCED_RE =
	/Last synced:\s*(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::\d{2})?/i;

/** Compact UI label: "18:54 - 17.09.2026" */
export function formatDocsSyncStampLabel(raw: string | null | undefined): string | null {
	if (!raw) return null;
	const match = raw.match(LAST_SYNCED_RE);
	if (!match) return null;
	const [, year, month, day, hour, minute] = match;
	return `${hour}:${minute} - ${day}.${month}.${year}`;
}

export function knowledgeListItems(payload: unknown): Array<{ name?: string; description?: string }> {
	if (Array.isArray(payload)) return payload;
	if (payload && typeof payload === 'object') {
		const obj = payload as { items?: unknown; data?: unknown };
		if (Array.isArray(obj.items)) return obj.items;
		if (Array.isArray(obj.data)) return obj.data;
	}
	return [];
}

export function docsSyncLabelFromKnowledgePayload(payload: unknown): string | null {
	const items = knowledgeListItems(payload);
	const collection = items.find((item) => item?.name === AECP_DOCS_KNOWLEDGE_NAME);
	return formatDocsSyncStampLabel(collection?.description);
}
