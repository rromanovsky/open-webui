import { describe, expect, it } from 'vitest';
import {
	AECP_API_BASE_DEFAULT,
	dashboardIndexPath,
	dashboardTaskLabel,
	focusTaskIdToPin,
	isDashboardTabHidden,
	joinAecpApiUrl,
	parseDashboardSearch,
	projectTasksPath,
	recentDashboardTasks,
	resolveAecpApiBaseUrl,
	resolveDashboardTaskId,
	rewriteDockerDesktopHost,
	resultPath,
	taskLiveChainPath,
	withDashboardTaskId,
	type DashboardTaskOption
} from './aecpProjectApi';

describe('rewriteDockerDesktopHost', () => {
	it('rewrites Compose hostname to loopback for the browser Face', () => {
		expect(rewriteDockerDesktopHost('http://host.docker.internal:3000')).toBe(
			'http://127.0.0.1:3000'
		);
	});

	it('leaves loopback origins intact', () => {
		expect(rewriteDockerDesktopHost('http://127.0.0.1:3010/')).toBe('http://127.0.0.1:3010');
	});
});

describe('resolveAecpApiBaseUrl', () => {
	it('prefers query, then storage, then default', () => {
		expect(
			resolveAecpApiBaseUrl({
				queryBase: 'http://127.0.0.1:3010',
				storedBase: 'http://127.0.0.1:3010'
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
		expect(projectTasksPath('proj-1')).toBe('/api/v1/projects/proj-1/tasks');
		expect(resultPath('result-1')).toBe('/api/v1/results/result-1');
		expect(joinAecpApiUrl('http://127.0.0.1:3010', taskLiveChainPath('task-1'))).toBe(
			'http://127.0.0.1:3010/api/v1/tasks/task-1/live-chain'
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

describe('resolveDashboardTaskId', () => {
	it('uses focusTask when the URL has no taskId', () => {
		expect(
			resolveDashboardTaskId({
				queryTaskId: null,
				focusTaskId: 'focus-1'
			})
		).toBe('focus-1');
	});

	it('lets explicit ?taskId= win over focusTask', () => {
		expect(
			resolveDashboardTaskId({
				queryTaskId: 'query-1',
				focusTaskId: 'focus-1'
			})
		).toBe('query-1');
	});

	it('stays empty when neither query nor focusTask is present', () => {
		expect(resolveDashboardTaskId({ queryTaskId: null, focusTaskId: null })).toBeNull();
	});

	it('lets a switcher pin override a stale page-store taskId', () => {
		expect(
			resolveDashboardTaskId({
				queryTaskId: 'query-1',
				pinnedTaskId: 'picked-2',
				focusTaskId: 'focus-1'
			})
		).toBe('picked-2');
	});
});

describe('focusTaskIdToPin', () => {
	it('pins focus once when the URL has no taskId', () => {
		expect(
			focusTaskIdToPin({ queryTaskId: null, pinnedTaskId: null, focusTaskId: 'focus-1' })
		).toBe('focus-1');
	});

	it('does not retarget when a query or pin is already set', () => {
		expect(
			focusTaskIdToPin({ queryTaskId: 'query-1', pinnedTaskId: null, focusTaskId: 'focus-1' })
		).toBeNull();
		expect(
			focusTaskIdToPin({ queryTaskId: null, pinnedTaskId: 'pinned-1', focusTaskId: 'focus-2' })
		).toBeNull();
	});
});

describe('recentDashboardTasks', () => {
	const tasks: DashboardTaskOption[] = [
		{
			id: 'old',
			key: 'AECP-1',
			title: 'Old',
			status: 'done',
			updatedAt: '2026-09-01T00:00:00.000Z'
		},
		{
			id: 'new',
			key: 'AECP-3',
			title: 'New',
			status: 'ready',
			updatedAt: '2026-09-20T00:00:00.000Z'
		},
		{
			id: 'mid',
			key: 'AECP-2',
			title: 'Mid',
			status: 'ready',
			updatedAt: '2026-09-10T00:00:00.000Z'
		}
	];

	it('orders by updatedAt descending and caps the window', () => {
		expect(recentDashboardTasks(tasks, { limit: 2 }).map((task) => task.id)).toEqual([
			'new',
			'mid'
		]);
	});

	it('keeps the focused Task when it falls outside the cap', () => {
		expect(
			recentDashboardTasks(tasks, { limit: 1, includeId: 'old' }).map((task) => task.id)
		).toEqual(['new', 'old']);
	});

	it('breaks timestamp ties by key', () => {
		const tied: DashboardTaskOption[] = [
			{
				id: 'b',
				key: 'AECP-2',
				title: 'B',
				status: 'ready',
				updatedAt: '2026-09-20T00:00:00.000Z'
			},
			{ id: 'a', key: 'AECP-1', title: 'A', status: 'ready', updatedAt: '2026-09-20T00:00:00.000Z' }
		];
		expect(recentDashboardTasks(tied).map((task) => task.id)).toEqual(['a', 'b']);
		expect(dashboardTaskLabel(tied[0])).toBe('AECP-2 · B · ready');
	});
});

describe('isDashboardTabHidden', () => {
	it('stops polling only while the tab is hidden', () => {
		expect(isDashboardTabHidden('hidden')).toBe(true);
		expect(isDashboardTabHidden('visible')).toBe(false);
	});
});

describe('withDashboardTaskId', () => {
	it('soft-sets taskId without dropping other search keys', () => {
		expect(withDashboardTaskId('/dashboard?projectId=p1', 'task-9')).toBe(
			'/dashboard?projectId=p1&taskId=task-9'
		);
	});
});
