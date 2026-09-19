<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { WEBUI_NAME, showSidebar, mobile } from '$lib/stores';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import SidebarIcon from '$lib/components/icons/Sidebar.svelte';
	import { enterDashboardSurface } from '$lib/utils/softHome';

	const i18n = getContext('i18n');

	const cards = [
		{
			title: 'Tasks overview',
			body: 'Placeholder. Task counts will load from the Project API later.'
		},
		{
			title: 'Gates / waiting owner',
			body: 'Placeholder. Owner gates will load from the Project API later.'
		},
		{
			title: 'Workers / health',
			body: 'Placeholder. Worker health will load from the Project API later.'
		},
		{
			title: 'Recent activity',
			body: 'Placeholder. Activity will load from the Project API later.'
		}
	];

	onMount(() => {
		enterDashboardSurface();
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
			Live AECP metrics will appear here later via the Project API. The cards below are a layout
			shell — not live data, and not fabricated numbers.
		</p>

		<div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
			{#each cards as card (card.title)}
				<section
					class="rounded-xl border border-gray-100 dark:border-gray-850 bg-gray-50/70 dark:bg-gray-850/40 p-4"
				>
					<h2 class="text-sm font-medium text-gray-800 dark:text-gray-100">{card.title}</h2>
					<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{card.body}</p>
				</section>
			{/each}
		</div>
	</div>
</div>
