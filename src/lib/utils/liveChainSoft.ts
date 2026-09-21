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

export function formatResultDetails(details: unknown): string {
	try {
		return JSON.stringify(details, null, 2);
	} catch {
		return String(details);
	}
}
