import { describe, expect, it } from 'vitest';
import {
	AECP_API_BASE_DEFAULT,
	dashboardIndexPath,
	joinAecpApiUrl,
	parseDashboardSearch,
	resolveAecpApiBaseUrl,
	rewriteDockerDesktopHost,
	taskLiveChainPath
} from './aecpProjectApi';

describe('rewriteDockerDesktopHost', () => {
	it('rewrites Compose hostname to loopback for the browser Face', () => {
		expect(rewriteDockerDesktopHost('http://host.docker.internal:3000')).toBe(
			'http://127.0.0.1:3000'
		);
	});

	it('leaves loopback origins intact', () => {
		expect(rewriteDockerDesktopHost('http://127.0.0.1:3000/')).toBe('http://127.0.0.1:3000');
	});
});

describe('resolveAecpApiBaseUrl', () => {
	it('prefers query, then storage, then default', () => {
		expect(
			resolveAecpApiBaseUrl({
				queryBase: 'http://127.0.0.1:3010',
				storedBase: 'http://127.0.0.1:3000'
			})
		).toBe('http://127.0.0.1:3010');
		expect(resolveAecpApiBaseUrl({ storedBase: 'http://host.docker.internal:3000' })).toBe(
			'http://host.docker.internal:3000'
		);
		expect(resolveAecpApiBaseUrl({})).toBe(AECP_API_BASE_DEFAULT);
	});
});

describe('paths and search', () => {
	it('builds dashboard and live-chain URLs', () => {
		expect(dashboardIndexPath()).toBe('/api/v1/dashboard');
		expect(dashboardIndexPath('proj-1')).toBe('/api/v1/dashboard?projectId=proj-1');
		expect(taskLiveChainPath('task-1')).toBe('/api/v1/tasks/task-1/live-chain');
		expect(joinAecpApiUrl('http://127.0.0.1:3000', taskLiveChainPath('task-1'))).toBe(
			'http://127.0.0.1:3000/api/v1/tasks/task-1/live-chain'
		);
	});

	it('parses Face dashboard query keys', () => {
		expect(parseDashboardSearch('?taskId=abc&projectId=p1')).toEqual({
			taskId: 'abc',
			projectId: 'p1',
			apiBase: null
		});
		expect(parseDashboardSearch('')).toEqual({ taskId: null, projectId: null, apiBase: null });
	});
});
