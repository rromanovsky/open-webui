<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { page } from '$app/stores';
	import { WEBUI_NAME, showSidebar, mobile } from '$lib/stores';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import SidebarIcon from '$lib/components/icons/Sidebar.svelte';
	import { enterDashboardSurface } from '$lib/utils/softHome';
	import {
		DASHBOARD_POLL_MS,
		dashboardIndexPath,
		dashboardTaskLabel,
		fetchAecpJson,
		focusTaskIdToPin,
		isDashboardTabHidden,
		joinAecpApiUrl,
		parseDashboardSearch,
		projectTasksPath,
		readStoredAecpApiBase,
		recentDashboardTasks,
		resolveAecpApiBaseUrl,
		resolveDashboardTaskId,
		resultPath,
		taskLiveChainPath,
		withDashboardTaskId,
		type DashboardTaskOption
	} from '$lib/utils/aecpProjectApi';
	import {
		formatResultDetails,
		hasSoftPeek,
		type FaceConciergePeek,
		type FaceLiveChainStep
	} from '$lib/utils/liveChainSoft';

	const i18n = getContext('i18n');

	type LinkStatus = 'ok' | 'degraded' | 'down' | 'idle' | 'unknown';

	type ChainHop = {
		id: string;
		label: string;
		lane: string;
		status: LinkStatus;
		summary: string;
		gap: string | null;
	};

	type BotHealth = {
		id: string;
		label: string;
		status: LinkStatus;
		summary: string;
		stalled: number;
		recentFailures: number;
	};

	type FocusTask = { id: string; key: string; title: string; status: string; updatedAt: string };

	type DashboardIndex = {
		overall: LinkStatus;
		emptyReason: string | null;
		selected: {
			overall: LinkStatus;
			project: { id: string; key: string; name: string };
			chain: ChainHop[];
			bots: BotHealth[];
			temporal: { reachable: boolean; error: string | null };
			stalledRuns: unknown[];
			recentFailures: unknown[];
			openWebUi: { reachable: boolean };
			devContour: { reachable: boolean };
			focusTask: FocusTask | null;
		} | null;
	};

	type LiveChainStep = FaceLiveChainStep;

	type LiveChain = {
		task: { id: string; key: string; status: string; title: string };
		workflow: { workflowId: string; status: string | null; peekError: string | null };
		steps: LiveChainStep[];
		conciergePeek: FaceConciergePeek;
	};

	type DetailsState =
		| { status: 'loading' }
		| { status: 'ok'; json: unknown }
		| { status: 'error'; error: string };

	const STEP_LABELS: Record<string, string> = {
		architect: 'Architect',
		team_lead: 'Team Lead',
		developer: 'Developer',
		qa: 'QA',
		reviewer: 'Reviewer',
		acceptance_reviewer: 'Acceptance',
		owner_gate: 'Owner gate'
	};

	let health: DashboardIndex | null = null;
	let healthError: string | null = null;
	let healthLoading = true;
	let chain: LiveChain | null = null;
	let chainError: string | null = null;
	let chainLoading = false;
	let projectTasks: DashboardTaskOption[] = [];
	let pinnedTaskId: string | null = null;
	let openSoftRole: string | null = null;
	let detailsByRef: Record<string, DetailsState> = {};
	let lastHealthKey = '';
	let lastChainKey = '';
	let lastTasksKey = '';
	let healthRequest = 0;
	let chainRequest = 0;
	let tasksRequest = 0;
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	$: search = parseDashboardSearch($page.url.search);
	$: apiBase = resolveAecpApiBaseUrl({
		queryBase: search.apiBase,
		storedBase: typeof window === 'undefined' ? null : readStoredAecpApiBase(window.localStorage)
	});
	$: resolvedTaskId = resolveDashboardTaskId({
		queryTaskId: search.taskId,
		pinnedTaskId,
		focusTaskId: health?.selected?.focusTask?.id ?? null
	});
	$: taskOptions = recentDashboardTasks(projectTasks, { includeId: resolvedTaskId });

	$: if (typeof window !== 'undefined' && apiBase) {
		void loadHealth(apiBase, search.projectId);
		const projectId = health?.selected?.project.id ?? null;
		if (projectId) void loadProjectTasks(apiBase, projectId);
		const pin = focusTaskIdToPin({
			queryTaskId: search.taskId,
			pinnedTaskId,
			focusTaskId: health?.selected?.focusTask?.id ?? null
		});
		if (pin) {
			pinnedTaskId = pin;
			softSetTaskId(pin);
		}
		if (search.taskId || pinnedTaskId || health !== null || healthError) {
			void loadLiveChain(apiBase, resolvedTaskId);
		}
	}

	function softSetTaskId(taskId: string) {
		const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
		const next = withDashboardTaskId(current, taskId);
		if (next !== current) {
			window.history.replaceState(window.history.state, '', next);
		}
	}

	function pickTask(taskId: string) {
		if (!taskId || taskId === resolvedTaskId) return;
		pinnedTaskId = taskId;
		openSoftRole = null;
		softSetTaskId(taskId);
	}

	function onTaskSwitcherChange(event: Event) {
		const target = event.currentTarget;
		if (!(target instanceof HTMLSelectElement)) return;
		pickTask(target.value);
	}

	async function loadHealth(base: string, projectId: string | null, options?: { force?: boolean }) {
		const key = `${base}|${projectId ?? ''}`;
		if (!options?.force && key === lastHealthKey) return;
		lastHealthKey = key;
		const request = ++healthRequest;
		if (!health) healthLoading = true;
		const result = await fetchAecpJson<DashboardIndex>(
			joinAecpApiUrl(base, dashboardIndexPath(projectId))
		);
		if (request !== healthRequest) return;
		healthLoading = false;
		if (!result.ok) {
			if (health) return;
			health = null;
			healthError = result.error;
			return;
		}
		healthError = null;
		health = result.data;
	}

	async function loadProjectTasks(base: string, projectId: string, options?: { force?: boolean }) {
		const key = `${base}|${projectId}`;
		if (!options?.force && key === lastTasksKey) return;
		lastTasksKey = key;
		const request = ++tasksRequest;
		const result = await fetchAecpJson<DashboardTaskOption[]>(
			joinAecpApiUrl(base, projectTasksPath(projectId))
		);
		if (request !== tasksRequest) return;
		if (!result.ok) return;
		projectTasks = result.data;
	}

	async function loadLiveChain(base: string, taskId: string | null, options?: { force?: boolean }) {
		const key = `${base}|${taskId ?? ''}`;
		if (!options?.force && key === lastChainKey) return;
		lastChainKey = key;
		if (!taskId) {
			chain = null;
			chainError = null;
			chainLoading = false;
			return;
		}
		const request = ++chainRequest;
		const switching = chain?.task.id !== taskId;
		if (switching) chainLoading = true;
		const result = await fetchAecpJson<LiveChain>(joinAecpApiUrl(base, taskLiveChainPath(taskId)));
		if (request !== chainRequest) return;
		chainLoading = false;
		if (!result.ok) {
			if (chain?.task.id === taskId) return;
			chain = null;
			chainError = result.status === 404 ? 'Task not found' : result.error;
			return;
		}
		chainError = null;
		chain = result.data;
	}

	function stopDashboardPoll() {
		if (pollTimer !== null) {
			clearInterval(pollTimer);
			pollTimer = null;
		}
	}

	function refreshDashboard() {
		if (isDashboardTabHidden(document.visibilityState)) {
			stopDashboardPoll();
			return;
		}
		if (!apiBase) return;
		void loadHealth(apiBase, search.projectId, { force: true });
		const projectId = health?.selected?.project.id ?? null;
		if (projectId) void loadProjectTasks(apiBase, projectId, { force: true });
		void loadLiveChain(apiBase, resolvedTaskId, { force: true });
	}

	function startDashboardPoll() {
		stopDashboardPoll();
		if (isDashboardTabHidden(document.visibilityState)) return;
		pollTimer = setInterval(refreshDashboard, DASHBOARD_POLL_MS);
	}

	function onVisibilityChange() {
		if (isDashboardTabHidden(document.visibilityState)) {
			stopDashboardPoll();
			return;
		}
		refreshDashboard();
		startDashboardPoll();
	}

	function stepLabel(role: string): string {
		return STEP_LABELS[role] ?? role;
	}

	function toggleSoft(step: LiveChainStep) {
		const next = openSoftRole === step.role ? null : step.role;
		openSoftRole = next;
		if (next && step.soft.detailsRef && apiBase) {
			void loadResultDetails(apiBase, step.soft.detailsRef);
		}
	}

	async function loadResultDetails(base: string, resultId: string) {
		const current = detailsByRef[resultId];
		if (current?.status === 'ok' || current?.status === 'loading') return;
		detailsByRef = { ...detailsByRef, [resultId]: { status: 'loading' } };
		const result = await fetchAecpJson<{ details: unknown }>(
			joinAecpApiUrl(base, resultPath(resultId))
		);
		if (!result.ok) {
			detailsByRef = { ...detailsByRef, [resultId]: { status: 'error', error: result.error } };
			return;
		}
		detailsByRef = { ...detailsByRef, [resultId]: { status: 'ok', json: result.data.details } };
	}

	onMount(() => {
		enterDashboardSurface();
		document.addEventListener('visibilitychange', onVisibilityChange);
		startDashboardPoll();
		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			stopDashboardPoll();
		};
	});
</script>

<svelte:head>
	<!-- LICENSE covers this Open WebUI browser-title identifier.
	Do not alter, remove, obscure, or replace it except as LICENSE permits:
	https://docs.openwebui.com/license. -->
	<title>
		{$i18n.t('Dashboard')} / {$WEBUI_NAME}
	</title>
</svelte:head>

<div
	class="flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
		? 'md:max-w-[calc(100%-var(--sidebar-width))]'
		: ''} max-w-full"
>
	<nav class="px-3 pt-2 pb-2 backdrop-blur-xl drag-region select-none shrink-0">
		<div class="flex items-center gap-0.5 md:gap-1">
			{#if $mobile}
				<div class="{$showSidebar ? 'md:hidden' : ''} flex flex-none items-center">
					<Tooltip
						content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
						interactive={true}
					>
						<button
							id="sidebar-toggle-button"
							class="cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition"
							aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
							on:click={() => showSidebar.set(!$showSidebar)}
						>
							<div class="self-center p-1.5">
								<SidebarIcon className="size-4" />
							</div>
						</button>
					</Tooltip>
				</div>
			{/if}

			<div class="flex w-full items-center py-1">
				<span class="min-w-fit px-1 text-sm font-medium select-none">{$i18n.t('Dashboard')}</span>
			</div>
		</div>
	</nav>

	<div class="flex-1 max-h-full overflow-y-auto px-4 pb-8 pt-2 md:px-6">
		<p class="max-w-3xl text-sm text-gray-500 dark:text-gray-400">
			Live Project API projection for Face. PostgreSQL is source of truth. Soft tails stay behind …
			— not AcceptanceDecision, not Task done, not chat.
		</p>

		<section class="mt-5" aria-labelledby="layer-a-heading">
			<h2 id="layer-a-heading" class="text-sm font-medium text-gray-800 dark:text-gray-100">
				System health
			</h2>
			{#if healthLoading}
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading project dashboard…</p>
			{:else if healthError}
				<p class="mt-2 text-sm text-red-600 dark:text-red-400">
					Could not load GET /api/v1/dashboard ({healthError}). Check AECP_API_BASE_URL / ?apiBase=
					and CORS.
				</p>
			{:else if health?.emptyReason}
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{health.emptyReason}</p>
			{:else if health?.selected}
				{@const selected = health.selected}
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					{selected.project.key} · {selected.project.name} · overall {selected.overall}
				</p>
				<div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
					<section
						class="rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/70 dark:bg-gray-850/40 p-4"
					>
						<h3 class="text-sm font-medium text-gray-800 dark:text-gray-100">Chain hops</h3>
						<ul class="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
							{#each selected.chain as hop (hop.id)}
								<li>
									<span class="font-medium">{hop.label}</span>
									<span class="text-gray-400">· {hop.status}</span>
									<span class="text-gray-500 dark:text-gray-400"> — {hop.summary}</span>
								</li>
							{/each}
						</ul>
					</section>
					<section
						class="rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/70 dark:bg-gray-850/40 p-4"
					>
						<h3 class="text-sm font-medium text-gray-800 dark:text-gray-100">Bots / Temporal</h3>
						<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
							Temporal {selected.temporal.reachable ? 'reachable' : 'unreachable'}
							{#if selected.temporal.error}
								<span class="text-gray-500">({selected.temporal.error})</span>
							{/if}
						</p>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
							Stalled runs {selected.stalledRuns.length} · recent failures {selected.recentFailures
								.length}
						</p>
						<ul class="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
							{#each selected.bots as bot (bot.id)}
								<li>
									<span class="font-medium">{bot.label}</span>
									<span class="text-gray-400">· {bot.status}</span>
									<span class="text-gray-500"> — stalled {bot.stalled}</span>
								</li>
							{/each}
						</ul>
					</section>
				</div>
			{/if}
		</section>

		<section class="mt-8" aria-labelledby="layer-b10-heading">
			<h2 id="layer-b10-heading" class="text-sm font-medium text-gray-800 dark:text-gray-100">
				Task theater
			</h2>
			{#if taskOptions.length > 0}
				<label
					class="mt-2 flex max-w-xl flex-col gap-1 text-xs text-gray-500 dark:text-gray-400"
					for="dashboard-task-switcher"
				>
					Task
					<select
						id="dashboard-task-switcher"
						class="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-800 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
						value={resolvedTaskId ?? ''}
						on:change={onTaskSwitcherChange}
					>
						{#each taskOptions as task (task.id)}
							<option value={task.id}>{dashboardTaskLabel(task)}</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if chainLoading || (healthLoading && !search.taskId && !pinnedTaskId && !chain)}
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading live-chain…</p>
			{:else if chainError}
				<p class="mt-2 text-sm text-red-600 dark:text-red-400">{chainError}</p>
			{:else if chain}
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					{chain.task.key} · {chain.task.title} · task {chain.task.status} · workflow
					{chain.workflow.status ?? 'unknown'}
					{#if !search.taskId && health?.selected?.focusTask?.id === chain.task.id}
						· default focus
					{/if}
					{#if chain.workflow.peekError}
						(peek fail-open: {chain.workflow.peekError})
					{/if}
				</p>
				<ol class="mt-3 flex flex-wrap gap-2">
					{#each chain.steps as step (step.role)}
						<li
							class="min-w-[9.5rem] flex-1 rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/70 dark:bg-gray-850/40 p-3"
						>
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="text-sm font-medium text-gray-800 dark:text-gray-100">
										{stepLabel(step.role)}
									</p>
									<p class="mt-0.5 text-xs uppercase tracking-wide text-gray-500">
										{step.state.replaceAll('_', ' ')}
									</p>
								</div>
								<button
									type="button"
									class="rounded px-1.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
									aria-expanded={openSoftRole === step.role}
									aria-label="Soft tails"
									disabled={!hasSoftPeek(step, chain.conciergePeek)}
									on:click={() => toggleSoft(step)}
								>
									…
								</button>
							</div>
							{#if step.summary}
								<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">{step.summary}</p>
							{/if}
							{#if step.errorHint}
								<p class="mt-1 text-xs text-red-600 dark:text-red-400">{step.errorHint}</p>
							{/if}
							<p class="mt-1 text-xs text-gray-400">
								artifacts {step.artifactCount}
							</p>
							{#if openSoftRole === step.role}
								<div
									class="mt-2 space-y-2 rounded-lg bg-white/70 p-2 text-xs text-gray-600 dark:bg-black/20 dark:text-gray-300"
								>
									{#if step.soft.detailsRef}
										{@const details = detailsByRef[step.soft.detailsRef]}
										<section>
											<p class="font-medium text-gray-700 dark:text-gray-200">Result details</p>
											{#if details?.status === 'loading'}
												<p class="mt-1 text-gray-400">Loading Result.details…</p>
											{:else if details?.status === 'error'}
												<p class="mt-1 text-gray-400">
													Details unavailable ({details.error}). Card still works.
												</p>
											{:else if details?.status === 'ok'}
												<pre
													class="mt-1 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-gray-600 dark:text-gray-300">{formatResultDetails(
														details.json
													)}</pre>
											{/if}
										</section>
									{/if}
									{#if step.soft.langfuseTraceUrl}
										<p>
											<a
												class="text-blue-600 underline dark:text-blue-400"
												href={step.soft.langfuseTraceUrl}
												target="_blank"
												rel="noreferrer"
											>
												Open Langfuse
											</a>
										</p>
									{:else if step.soft.langfuseTraceId}
										<p>Langfuse trace {step.soft.langfuseTraceId} (no LANGFUSE_HOST)</p>
									{/if}
									{#if chain.conciergePeek}
										<section>
											<p class="font-medium text-gray-700 dark:text-gray-200">Concierge peek</p>
											<p class="mt-0.5">{chain.conciergePeek.responseKind}</p>
											{#if chain.conciergePeek.recommendationSummary}
												<p class="mt-0.5">{chain.conciergePeek.recommendationSummary}</p>
											{/if}
										</section>
									{/if}
									{#if !hasSoftPeek(step, chain.conciergePeek)}
										<p>No soft tails for this step.</p>
									{/if}
									<p class="text-gray-400">Soft peek only — not SoT.</p>
								</div>
							{/if}
						</li>
					{/each}
				</ol>
			{:else}
				<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
					No Task to focus. Create one via the Project API, or pass
					<code class="text-xs">?taskId=</code> to load
					<code class="text-xs">GET /api/v1/tasks/:taskId/live-chain</code>.
				</p>
			{/if}
		</section>
	</div>
</div>
