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

const STRIP_BASE = 'min-w-[9.5rem] flex-1 rounded-xl border p-3 text-left';

/** Distinct B10 chip per live-chain state. Running keeps the ring. */
export function stepStripClass(state: string): string {
	if (state === 'running') {
		return `${STRIP_BASE} border-blue-400 bg-blue-50/80 ring-2 ring-blue-300/60 dark:border-blue-500 dark:bg-blue-950/40 dark:ring-blue-500/40`;
	}
	if (state === 'succeeded') {
		return `${STRIP_BASE} border-emerald-400 bg-emerald-50/80 dark:border-emerald-600 dark:bg-emerald-950/30`;
	}
	if (state === 'failed') {
		return `${STRIP_BASE} border-red-400 bg-red-50/70 dark:border-red-700 dark:bg-red-950/30`;
	}
	if (state === 'waiting_approval') {
		return `${STRIP_BASE} border-amber-400 bg-amber-50/80 dark:border-amber-600 dark:bg-amber-950/30`;
	}
	if (state === 'skipped') {
		return `${STRIP_BASE} border-dashed border-gray-300 bg-gray-50/40 line-through decoration-gray-400 dark:border-gray-600 dark:bg-gray-900/20`;
	}
	if (state === 'not_started') {
		return `${STRIP_BASE} border-gray-200 bg-transparent opacity-60 dark:border-gray-700`;
	}
	return `${STRIP_BASE} border-gray-100 bg-gray-50/70 dark:border-gray-850 dark:bg-gray-850/40`;
}

/** Running, else waiting approval, else the latest failed/succeeded step, else the first chip. */
export function defaultFocusedStepRole(
	steps: ReadonlyArray<{ role: string; state: string }>
): string | null {
	const running = steps.find((step) => step.state === 'running');
	if (running) return running.role;
	const waiting = steps.find((step) => step.state === 'waiting_approval');
	if (waiting) return waiting.role;
	for (let index = steps.length - 1; index >= 0; index -= 1) {
		const step = steps[index];
		if (step && (step.state === 'failed' || step.state === 'succeeded')) {
			return step.role;
		}
	}
	return steps[0]?.role ?? null;
}

export type CommittedFields = {
	recommendation: unknown | null;
	criteriaClaims: unknown | null;
	inputSnapshot: unknown | null;
	otherDetails: unknown | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function presentJson(value: unknown): unknown | null {
	if (value == null) return null;
	if (Array.isArray(value) && value.length === 0) return null;
	if (isRecord(value) && Object.keys(value).length === 0) return null;
	return value;
}

/** Pull SoT slices out of GET /results/:id (and optional Run.inputSnapshot). */
export function committedFields(input: {
	details: unknown;
	criteriaClaims?: unknown;
	inputSnapshot?: unknown;
}): CommittedFields {
	const details = isRecord(input.details) ? input.details : null;
	const recommendation = presentJson(details?.recommendation);
	const criteriaClaims =
		presentJson(input.criteriaClaims) ?? presentJson(details?.criteriaClaims);
	const inputSnapshot = presentJson(input.inputSnapshot) ?? presentJson(details?.inputSnapshot);
	if (!details) {
		return {
			recommendation: null,
			criteriaClaims,
			inputSnapshot,
			otherDetails: presentJson(input.details)
		};
	}
	const rest: Record<string, unknown> = { ...details };
	delete rest.recommendation;
	delete rest.criteriaClaims;
	delete rest.inputSnapshot;
	return {
		recommendation,
		criteriaClaims,
		inputSnapshot,
		otherDetails: Object.keys(rest).length > 0 ? rest : null
	};
}

export function formatResultDetails(details: unknown): string {
	try {
		return JSON.stringify(details, null, 2);
	} catch {
		return String(details);
	}
}
