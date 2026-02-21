<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import DashboardCard from './DashboardCard.svelte';

	interface DiscordChannel {
		channelId: string;
		name: string;
		type: number;
		parentId: string | null;
		parentName: string | null;
		systemPrompt: string | null;
	}

	let { class: className = '' }: { class?: string } = $props();

	let channels = $state<DiscordChannel[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let expandedChannelId = $state<string | null>(null);

	const stats = $derived.by(() => {
		const configured = channels.filter((c) => c.systemPrompt).length;
		const total = channels.length;
		return { configured, total };
	});

	const subtitle = $derived.by(() => {
		if (stats.total === 0) return '';
		return `${stats.configured} configured · ${stats.total} total`;
	});

	function renderMarkdown(text: string): string {
		return marked.parse(text, { breaks: true }) as string;
	}

	function toggleExpanded(channelId: string) {
		expandedChannelId = expandedChannelId === channelId ? null : channelId;
	}

	/** Channel type to prefix character */
	function channelPrefix(type: number): string {
		switch (type) {
			case 0: return '#';    // text
			case 2: return '🔊 '; // voice
			case 15: return '📋 '; // forum
			default: return '#';
		}
	}

	async function fetchChannels() {
		try {
			const res = await fetch('/api/openclaw/discord-channels');
			if (!res.ok) {
				const payload = await res.json();
				throw new Error(payload.error ?? `HTTP ${res.status}`);
			}
			channels = await res.json();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchChannels();
	});
</script>

<DashboardCard title="Discord Channels" {subtitle} class={className}>
	{#if loading}
		<div class="text-sm text-zinc-500">Loading channels...</div>
	{:else if error}
		<div class="text-sm text-red-400">{error}</div>
	{:else if channels.length === 0}
		<div class="text-sm text-zinc-500">No channels found</div>
	{:else}
		<div class="space-y-0.5">
			{#each channels as channel}
				<div>
					<button
						type="button"
						class="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors w-full text-left {expandedChannelId === channel.channelId ? 'bg-zinc-800/30' : ''}"
						onclick={() => toggleExpanded(channel.channelId)}
					>
						<div
							class="h-2.5 w-2.5 rounded-full flex-shrink-0 {channel.systemPrompt ? 'bg-violet-500' : 'bg-zinc-600'}"
							class:shadow-[0_0_6px_rgba(139,92,246,0.4)]={!!channel.systemPrompt}
						></div>
						<span class="text-sm font-medium truncate flex-1 min-w-0" class:text-zinc-500={!channel.systemPrompt}>
							{channelPrefix(channel.type)}{channel.name}
						</span>
						{#if channel.parentName}
							<span class="text-xs text-zinc-600 flex-shrink-0">{channel.parentName}</span>
						{/if}
						{#if channel.systemPrompt}
							<svg class="w-3.5 h-3.5 text-zinc-600 transition-transform flex-shrink-0 {expandedChannelId === channel.channelId ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						{/if}
					</button>
					{#if expandedChannelId === channel.channelId && channel.systemPrompt}
						<div class="px-4 py-3 border-t border-zinc-800/50 bg-zinc-950/50 rounded-b-lg mx-1 mb-1">
							<div class="text-xs text-zinc-500 mb-2 font-medium">System Prompt</div>
							<div class="channel-markdown text-sm text-zinc-300 max-w-none">
								{@html renderMarkdown(channel.systemPrompt)}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</DashboardCard>

<style>
	.channel-markdown :global(h1),
	.channel-markdown :global(h2),
	.channel-markdown :global(h3),
	.channel-markdown :global(h4) {
		font-weight: 600;
		margin-top: 1em;
		margin-bottom: 0.5em;
		color: var(--color-zinc-200);
	}
	.channel-markdown :global(h1) {
		font-size: 1.1em;
	}
	.channel-markdown :global(h2) {
		font-size: 1em;
	}
	.channel-markdown :global(h3),
	.channel-markdown :global(h4) {
		font-size: 0.9em;
	}
	.channel-markdown :global(p) {
		margin-bottom: 0.5em;
		line-height: 1.6;
	}
	.channel-markdown :global(ul),
	.channel-markdown :global(ol) {
		padding-left: 1.5em;
		margin-bottom: 0.5em;
	}
	.channel-markdown :global(ul) {
		list-style-type: disc;
	}
	.channel-markdown :global(ol) {
		list-style-type: decimal;
	}
	.channel-markdown :global(li) {
		margin-bottom: 0.25em;
		line-height: 1.5;
	}
	.channel-markdown :global(pre) {
		background-color: rgb(39 39 42 / 0.5);
		border-radius: 0.375rem;
		padding: 0.75em 1em;
		margin-bottom: 0.75em;
		overflow-x: auto;
		font-size: 0.85em;
	}
	.channel-markdown :global(code) {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.9em;
	}
	.channel-markdown :global(:not(pre) > code) {
		background-color: rgb(39 39 42 / 0.5);
		padding: 0.15em 0.35em;
		border-radius: 0.25rem;
		color: var(--color-zinc-300);
	}
	.channel-markdown :global(strong) {
		font-weight: 600;
		color: var(--color-zinc-200);
	}
	.channel-markdown :global(a) {
		color: var(--color-blue-400);
		text-decoration: underline;
	}
	.channel-markdown :global(blockquote) {
		border-left: 3px solid rgb(63 63 70);
		padding-left: 1em;
		margin-left: 0;
		margin-bottom: 0.5em;
		color: var(--color-zinc-400);
	}
</style>
