<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	import Chat from '$lib/components/chat/Chat.svelte';
	import { rememberLastSurface } from '$lib/utils/softHome';

	onMount(() => {
		rememberLastSurface('chat');
	});
</script>

<Chat chatIdProp={$page.params.id} />
