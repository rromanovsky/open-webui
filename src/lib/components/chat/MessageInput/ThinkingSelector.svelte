<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte';

	import { getKnowledgeBases } from '$lib/apis/knowledge';
	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import DropdownMenu from '$lib/components/common/DropdownMenu.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Bolt from '$lib/components/icons/Bolt.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import { docsSyncLabelFromKnowledgePayload } from '$lib/utils/docsSyncStamp';
	import {
		THINKING_LEVELS,
		type ThinkingLevel
	} from '$lib/utils/thinking';

	const i18n = getContext('i18n');

	export let value: ThinkingLevel = 'auto';
	export let modelLabel = '';
	export let disabled = false;
	export let onChange: (level: ThinkingLevel) => void = () => {};

	let show = false;
	let docsSyncLabel: string | null = null;
	let refreshTimer: ReturnType<typeof setInterval> | null = null;

	const thinkingLabel = (level: ThinkingLevel): string => {
		switch (level) {
			case 'auto':
				return $i18n.t('Auto');
			case 'none':
				return $i18n.t('None');
			case 'low':
				return $i18n.t('Low');
			case 'medium':
				return $i18n.t('Medium');
			case 'high':
				return $i18n.t('High');
			default: {
				const _exhaustive: never = level;
				return _exhaustive;
			}
		}
	};

	$: if (disabled && show) show = false;

	$: triggerText = modelLabel
		? `${modelLabel} · ${thinkingLabel(value)}`
		: `${$i18n.t('Thinking')}: ${thinkingLabel(value)}`;
	$: tooltipText = modelLabel
		? docsSyncLabel
			? `${$i18n.t('Thinking')} · ${modelLabel} · docs ${docsSyncLabel}`
			: `${$i18n.t('Thinking')} · ${modelLabel}`
		: $i18n.t('Thinking');

	$: triggerClass = `flex items-center gap-1 rounded-lg pl-1.5 pr-1 py-1 text-[0.8125rem] font-normal transition-colors duration-100 ${
		disabled
			? 'cursor-not-allowed opacity-40 text-gray-400 dark:text-gray-600'
			: `text-gray-600 hover:bg-gray-50/40 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/40 dark:hover:text-gray-200 cursor-pointer ${
					value !== 'auto' ? '' : 'opacity-70'
				}`
	}`;

	const select = (level: ThinkingLevel) => {
		onChange(level);
		show = false;
	};

	const refreshDocsSyncLabel = async () => {
		try {
			const token = localStorage.token;
			if (!token) {
				docsSyncLabel = null;
				return;
			}
			const payload = await getKnowledgeBases(token);
			docsSyncLabel = docsSyncLabelFromKnowledgePayload(payload);
		} catch {
			// Fail soft — picker still works without the stamp.
		}
	};

	onMount(() => {
		refreshDocsSyncLabel();
		const onFocus = () => refreshDocsSyncLabel();
		window.addEventListener('focus', onFocus);
		refreshTimer = setInterval(refreshDocsSyncLabel, 5 * 60_000);
		return () => {
			window.removeEventListener('focus', onFocus);
		};
	});

	onDestroy(() => {
		if (refreshTimer) clearInterval(refreshTimer);
	});
</script>

<div class="flex min-w-0 flex-col items-end gap-0.5">
	<div class="flex min-w-0 items-center">
		{#if disabled}
			<Tooltip content={tooltipText} placement="top">
				<button type="button" disabled aria-disabled="true" class={triggerClass}>
					<Bolt className="size-3.5 shrink-0" strokeWidth="2" />
					<span class="truncate max-w-[7.5rem] sm:max-w-[9.5rem]">
						{triggerText}
					</span>
				</button>
			</Tooltip>
		{:else}
			<Dropdown bind:show align="end">
				<Tooltip content={tooltipText} placement="top">
					<button
						type="button"
						class={triggerClass}
						aria-label={tooltipText}
						aria-haspopup="listbox"
					>
						<Bolt className="size-3.5 shrink-0" strokeWidth="2" />
						<span class="truncate max-w-[7.5rem] sm:max-w-[9.5rem]">
							{triggerText}
						</span>
						<ChevronDown className="size-3 shrink-0 opacity-70" strokeWidth="2" />
					</button>
				</Tooltip>

				<div slot="content">
					<DropdownMenu className="min-w-44">
						<div class="px-2.5 pt-1.5 pb-1">
							<div
								class="text-[0.625rem] font-normal uppercase tracking-wider text-gray-400 dark:text-gray-500"
							>
								{$i18n.t('Thinking')}
							</div>
							{#if modelLabel}
								<div
									class="mt-0.5 truncate text-[0.6875rem] font-normal text-gray-500 dark:text-gray-400"
								>
									{modelLabel}
								</div>
							{/if}
							{#if docsSyncLabel}
								<div
									class="mt-1 text-[0.5625rem] font-normal tabular-nums text-gray-400/90 dark:text-gray-500"
									title="AECP docs last synced"
								>
									docs {docsSyncLabel}
								</div>
							{/if}
						</div>
						{#each THINKING_LEVELS as level (level)}
							<button
								type="button"
								role="option"
								aria-selected={value === level}
								class="flex w-full items-center justify-between gap-2"
								on:click={() => select(level)}
							>
								<span class="flex items-center gap-2">
									<span
										class="flex size-3.5 shrink-0 items-center justify-center rounded-full border {value ===
										level
											? 'border-gray-800 dark:border-gray-100'
											: 'border-gray-300 dark:border-gray-600'}"
										aria-hidden="true"
									>
										{#if value === level}
											<span class="size-1.5 rounded-full bg-gray-800 dark:bg-gray-100"></span>
										{/if}
									</span>
									{thinkingLabel(level)}
								</span>
							</button>
						{/each}
					</DropdownMenu>
				</div>
			</Dropdown>
		{/if}
	</div>
	{#if docsSyncLabel}
		<div
			class="max-w-[9.5rem] truncate pr-1 text-[0.5625rem] leading-none tabular-nums text-gray-400/80 dark:text-gray-500"
			title="AECP docs last synced"
		>
			{docsSyncLabel}
		</div>
	{/if}
</div>
