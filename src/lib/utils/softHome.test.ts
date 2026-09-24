import { describe, expect, it } from 'vitest';
import { hasChatIntentQuery, normalizePathname, shouldSoftRedirectToDashboard } from './softHome';

describe('normalizePathname', () => {
	it('treats empty and trailing slashes as root', () => {
		expect(normalizePathname('')).toBe('/');
		expect(normalizePathname('/')).toBe('/');
		expect(normalizePathname('///')).toBe('/');
	});

	it('leaves deep links intact', () => {
		expect(normalizePathname('/c/abc')).toBe('/c/abc');
		expect(normalizePathname('/workspace/models/')).toBe('/workspace/models');
	});
});

describe('hasChatIntentQuery', () => {
	it('detects composer and model-picker params', () => {
		expect(hasChatIntentQuery('?q=hello')).toBe(true);
		expect(hasChatIntentQuery('models=foo')).toBe(true);
		expect(hasChatIntentQuery('?temporary-chat=true')).toBe(true);
	});

	it('ignores unrelated search', () => {
		expect(hasChatIntentQuery('')).toBe(false);
		expect(hasChatIntentQuery('?error=boom')).toBe(false);
	});
});

describe('shouldSoftRedirectToDashboard', () => {
	it('redirects a cold signed-in visit to /', () => {
		expect(shouldSoftRedirectToDashboard({ pathname: '/' })).toBe(true);
		expect(shouldSoftRedirectToDashboard({ pathname: '/', lastSurface: 'dashboard' })).toBe(true);
	});

	it('does not steal chat, share, workspace, admin, or auth routes', () => {
		const paths = [
			'/c/abc',
			'/s/shared',
			'/workspace',
			'/workspace/models',
			'/admin',
			'/admin/users',
			'/auth',
			'/error',
			'/dashboard',
			'/notes',
			'/home'
		];
		for (const pathname of paths) {
			expect(shouldSoftRedirectToDashboard({ pathname })).toBe(false);
		}
	});

	it('keeps New Chat and in-progress chat intent on /', () => {
		expect(shouldSoftRedirectToDashboard({ pathname: '/', stayOnChat: true })).toBe(false);
		expect(shouldSoftRedirectToDashboard({ pathname: '/', lastSurface: 'chat' })).toBe(false);
		expect(shouldSoftRedirectToDashboard({ pathname: '/', search: '?q=hi' })).toBe(false);
		expect(shouldSoftRedirectToDashboard({ pathname: '/', search: '?models=hermes' })).toBe(false);
	});
});
