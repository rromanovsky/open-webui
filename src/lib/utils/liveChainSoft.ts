/** Face helpers for B10 soft tails. Soft content is not SoT. */

export type FaceLiveChainSoft = {
	langfuseTraceId: string | null;
	langfuseTraceUrl: string | null;
	detailsRef: string | null;
};

export type FaceLiveChainStep = {
	role: string;
	state: string;
	runId: string | null;
	resultId: string | null;
	summary: string | null;
	artifactCount: number;
	errorHint: string | null;
	approvalRequestId: string | null;
	acceptanceDecisionId: string | null;
	soft: FaceLiveChainSoft;
};

export type FaceConciergePeek = {
	requestId: string;
	responseKind: string;
	recommendationSummary: string | null;
} | null;

/** http(s) Temporal UI href only. Anything else (including a gRPC address) is not a link. */
export function temporalUiHref(uiUrl: string | null | undefined): string | null {
	if (!uiUrl) {
		return null;
	}
	try {
		const url = new URL(uiUrl);
		if (url.protocol !== 'http:' && url.protocol !== 'https:') {
			return null;
		}
		return url.toString();
	} catch {
		return null;
	}
}

export function hasSoftPeek(
	step: Pick<FaceLiveChainStep, 'soft'>,
	conciergePeek: FaceConciergePeek
): boolean {
	return Boolean(step.soft.langfuseTraceId || step.soft.detailsRef || conciergePeek);
}

/** Open the … panel when SoT details, soft peeks, or a Temporal Actions link exist. */
export function canOpenStepPanel(
	step: Pick<FaceLiveChainStep, 'soft'>,
	conciergePeek: FaceConciergePeek,
	workflowUiUrl: string | null | undefined
): boolean {
	return hasSoftPeek(step, conciergePeek) || Boolean(temporalUiHref(workflowUiUrl));
}

/** Emphasize the running step on the B10 strip (Phase 1 light touch). */
export function stepStripClass(state: string): string {
	const base = 'min-w-[9.5rem] flex-1 rounded-xl border bg-gray-50/70 p-3 dark:bg-gray-850/40';
	if (state === 'running') {
		return `${base} border-blue-400 ring-2 ring-blue-300/60 dark:border-blue-500 dark:ring-blue-500/40`;
	}
	if (state === 'failed') {
		return `${base} border-red-300 dark:border-red-800`;
	}
	if (state === 'waiting_approval') {
		return `${base} border-amber-300 dark:border-amber-700`;
	}
	return `${base} border-gray-100 dark:border-gray-850`;
}

export function formatResultDetails(details: unknown): string {
	try {
		return JSON.stringify(details, null, 2);
	} catch {
		return String(details);
	}
}
