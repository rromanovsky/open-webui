import { describe, expect, it } from 'vitest';
import {
	canOpenStepPanel,
	formatResultDetails,
	hasSoftPeek,
	stepStripClass,
	type FaceLiveChainStep
} from './liveChainSoft';

const RESULT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

function step(soft: FaceLiveChainStep['soft']): FaceLiveChainStep {
	return {
		role: 'architect',
		state: 'succeeded',
		runId: null,
		resultId: null,
		summary: 'Architecture ready',
		artifactCount: 0,
		errorHint: null,
		approvalRequestId: null,
		acceptanceDecisionId: null,
		soft
	};
}

const emptySoft = {
	langfuseTraceId: null,
	langfuseTraceUrl: null,
	detailsRef: null
};

describe('hasSoftPeek', () => {
	it('hides the panel when langfuseTraceId, detailsRef, and Concierge peek are null', () => {
		expect(hasSoftPeek(step(emptySoft), null)).toBe(false);
	});

	it('shows the panel when detailsRef is present', () => {
		expect(hasSoftPeek(step({ ...emptySoft, detailsRef: RESULT_ID }), null)).toBe(true);
	});

	it('shows the panel when langfuseTraceId is present', () => {
		expect(
			hasSoftPeek(step({ ...emptySoft, langfuseTraceId: 'lf-1', langfuseTraceUrl: null }), null)
		).toBe(true);
	});

	it('shows the panel for a task-level Concierge peek even on an empty step', () => {
		expect(
			hasSoftPeek(step(emptySoft), {
				requestId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
				responseKind: 'answer',
				recommendationSummary: null
			})
		).toBe(true);
	});
});

describe('canOpenStepPanel', () => {
	it('opens when Temporal UI URL is present even without soft tails', () => {
		expect(canOpenStepPanel(step(emptySoft), null, 'http://127.0.0.1:8088')).toBe(true);
	});

	it('stays closed for empty soft and non-http Temporal address', () => {
		expect(canOpenStepPanel(step(emptySoft), null, '127.0.0.1:7233')).toBe(false);
	});
});

describe('stepStripClass', () => {
	it('emphasizes running steps', () => {
		expect(stepStripClass('running')).toContain('ring-2');
		expect(stepStripClass('succeeded')).not.toContain('ring-2');
	});
});

describe('formatResultDetails', () => {
	it('pretty-prints Result.details JSON for the C2 panel', () => {
		expect(formatResultDetails({ note: 'advisory' })).toBe('{\n  "note": "advisory"\n}');
	});
});
