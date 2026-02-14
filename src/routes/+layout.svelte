<script lang="ts">
	import '../app.css';
	import TopNav from '$lib/components/TopNav.svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
	<TopNav />
	<div class="flex-1 overflow-hidden">
		{@render children()}
	</div>
</div>
