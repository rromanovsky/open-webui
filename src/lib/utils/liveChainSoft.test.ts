import { describe, expect, it } from 'vitest';
import {
	canOpenStepPanel,
	committedFields,
	defaultFocusedStepRole,
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
	it('gives each live-chain state a distinct chip', () => {
		expect(stepStripClass('running')).toContain('ring-2');
		expect(stepStripClass('succeeded')).toContain('border-emerald-400');
		expect(stepStripClass('failed')).toContain('border-red-400');
		expect(stepStripClass('waiting_approval')).toContain('border-amber-400');
		expect(stepStripClass('not_started')).toContain('opacity-60');
		expect(stepStripClass('skipped')).toContain('border-dashed');
		expect(stepStripClass('succeeded')).not.toContain('ring-2');
		expect(stepStripClass('skipped')).not.toContain('opacity-60');
		expect(stepStripClass('not_started')).not.toContain('border-dashed');
	});
});

describe('defaultFocusedStepRole', () => {
	it('prefers running, then waiting_approval, then the latest finished step', () => {
		expect(
			defaultFocusedStepRole([
				{ role: 'architect', state: 'succeeded' },
				{ role: 'developer', state: 'running' },
				{ role: 'qa', state: 'not_started' }
			])
		).toBe('developer');
		expect(
			defaultFocusedStepRole([
				{ role: 'architect', state: 'succeeded' },
				{ role: 'developer', state: 'waiting_approval' },
				{ role: 'qa', state: 'not_started' }
			])
		).toBe('developer');
		expect(
			defaultFocusedStepRole([
				{ role: 'architect', state: 'succeeded' },
				{ role: 'developer', state: 'failed' },
				{ role: 'qa', state: 'skipped' }
			])
		).toBe('developer');
		expect(
			defaultFocusedStepRole([
				{ role: 'architect', state: 'not_started' },
				{ role: 'team_lead', state: 'not_started' }
			])
		).toBe('architect');
	});
});

describe('committedFields', () => {
	it('surfaces recommendation and criteriaClaims and keeps inputSnapshot separate', () => {
		const fields = committedFields({
			details: {
				recommendation: { recommendation: 'development' },
				note: 'advisory'
			},
			criteriaClaims: [{ id: 'ac-1', status: 'pass' }],
			inputSnapshot: { step: 'implementation' }
		});
		expect(fields.recommendation).toEqual({ recommendation: 'development' });
		expect(fields.criteriaClaims).toEqual([{ id: 'ac-1', status: 'pass' }]);
		expect(fields.inputSnapshot).toEqual({ step: 'implementation' });
		expect(fields.otherDetails).toEqual({ note: 'advisory' });
	});

	it('treats empty claims and a missing snapshot as absent', () => {
		const fields = committedFields({
			details: { note: 'only' },
			criteriaClaims: [],
			inputSnapshot: null
		});
		expect(fields.criteriaClaims).toBeNull();
		expect(fields.inputSnapshot).toBeNull();
		expect(fields.recommendation).toBeNull();
	});
});

describe('formatResultDetails', () => {
	it('pretty-prints Result.details JSON for the C2 panel', () => {
		expect(formatResultDetails({ note: 'advisory' })).toBe('{\n  "note": "advisory"\n}');
	});
});
