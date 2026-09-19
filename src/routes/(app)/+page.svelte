<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import Chat from '$lib/components/chat/Chat.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores';
	import {
		enterChatSurface,
		readLastSurface,
		readStayOnChat,
		shouldSoftRedirectToDashboard
	} from '$lib/utils/softHome';

	let showChat = false;

	onMount(() => {
		if ($page.url.searchParams.get('error')) {
			toast.error($page.url.searchParams.get('error') || 'An unknown error occurred.');
		}

		if (
			$user &&
			shouldSoftRedirectToDashboard({
				pathname: $page.url.pathname,
				search: $page.url.search,
				lastSurface: readLastSurface(),
				stayOnChat: readStayOnChat()
			})
		) {
			void goto('/dashboard', { replaceState: true });
			return;
		}

		enterChatSurface();
		showChat = true;
	});
</script>

{#if showChat}
	<Chat />
{/if}
