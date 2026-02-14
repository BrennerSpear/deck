<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		subtitle = '',
		class: className = '',
		children
	}: {
		title: string;
		subtitle?: string;
		class?: string;
		children: Snippet;
	} = $props();

	let collapsed = $state(false);
</script>

<div class="border border-zinc-800 rounded-lg bg-zinc-900 overflow-hidden {className}">
	<div
		class="flex items-center justify-between px-4 py-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/30 transition-colors"
		role="button"
		tabindex="0"
		onclick={() => (collapsed = !collapsed)}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') collapsed = !collapsed; }}
	>
		<div class="flex items-center gap-2">
			<h3 class="text-sm font-medium text-zinc-100">{title}</h3>
			{#if subtitle}
				<span class="text-xs text-zinc-500">{subtitle}</span>
			{/if}
		</div>
		<span class="text-zinc-500 text-xs">{collapsed ? '▶' : '▼'}</span>
	</div>
	{#if !collapsed}
		<div class="p-4">
			{@render children()}
		</div>
	{/if}
</div>
