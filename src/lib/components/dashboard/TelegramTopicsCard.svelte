<script lang="ts">
	import { onMount } from 'svelte';
	import { marked } from 'marked';
	import DashboardCard from './DashboardCard.svelte';

	interface TelegramTopic {
		topicId: string;
		name: string;
		systemPrompt: string | null;
	}

	let { class: className = '' }: { class?: string } = $props();

	let topics = $state<TelegramTopic[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let expandedTopicId = $state<string | null>(null);

	const stats = $derived.by(() => {
		const configured = topics.filter((t) => t.systemPrompt).length;
		const total = topics.length;
		return { configured, total };
	});

	const subtitle = $derived.by(() => {
		if (stats.total === 0) return '';
		return `${stats.configured} configured · ${stats.total} total`;
	});

	function renderMarkdown(text: string): string {
		return marked.parse(text, { breaks: true }) as string;
	}

	function toggleExpanded(topicId: string) {
		expandedTopicId = expandedTopicId === topicId ? null : topicId;
	}

	async function fetchTopics() {
		try {
			const res = await fetch('/api/openclaw/telegram-topics');
			if (!res.ok) {
				const payload = await res.json();
				throw new Error(payload.error ?? `HTTP ${res.status}`);
			}
			topics = await res.json();
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchTopics();
	});
</script>

<DashboardCard title="Telegram Topics" {subtitle} class={className}>
	{#if loading}
		<div class="text-sm text-zinc-500">Loading topics...</div>
	{:else if error}
		<div class="text-sm text-red-400">{error}</div>
	{:else if topics.length === 0}
		<div class="text-sm text-zinc-500">No topics found</div>
	{:else}
		<div class="space-y-0.5">
			{#each topics as topic}
				<div>
					<button
						type="button"
						class="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors w-full text-left {expandedTopicId === topic.topicId ? 'bg-zinc-800/30' : ''}"
						onclick={() => toggleExpanded(topic.topicId)}
					>
						<div
							class="h-2.5 w-2.5 rounded-full flex-shrink-0 {topic.systemPrompt ? 'bg-violet-500' : 'bg-zinc-600'}"
							class:shadow-[0_0_6px_rgba(139,92,246,0.4)]={!!topic.systemPrompt}
						></div>
						<span class="text-sm font-medium truncate flex-1 min-w-0" class:text-zinc-500={!topic.systemPrompt}>{topic.name}</span>
						{#if topic.systemPrompt}
							<svg class="w-3.5 h-3.5 text-zinc-600 transition-transform flex-shrink-0 {expandedTopicId === topic.topicId ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						{/if}
					</button>
					{#if expandedTopicId === topic.topicId && topic.systemPrompt}
						<div class="px-4 py-3 border-t border-zinc-800/50 bg-zinc-950/50 rounded-b-lg mx-1 mb-1">
							<div class="text-xs text-zinc-500 mb-2 font-medium">System Prompt</div>
							<div class="topic-markdown text-sm text-zinc-300 max-w-none">
								{@html renderMarkdown(topic.systemPrompt)}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</DashboardCard>

<style>
	.topic-markdown :global(h1),
	.topic-markdown :global(h2),
	.topic-markdown :global(h3),
	.topic-markdown :global(h4) {
		font-weight: 600;
		margin-top: 1em;
		margin-bottom: 0.5em;
		color: var(--color-zinc-200);
	}
	.topic-markdown :global(h1) {
		font-size: 1.1em;
	}
	.topic-markdown :global(h2) {
		font-size: 1em;
	}
	.topic-markdown :global(h3),
	.topic-markdown :global(h4) {
		font-size: 0.9em;
	}
	.topic-markdown :global(p) {
		margin-bottom: 0.5em;
		line-height: 1.6;
	}
	.topic-markdown :global(ul),
	.topic-markdown :global(ol) {
		padding-left: 1.5em;
		margin-bottom: 0.5em;
	}
	.topic-markdown :global(ul) {
		list-style-type: disc;
	}
	.topic-markdown :global(ol) {
		list-style-type: decimal;
	}
	.topic-markdown :global(li) {
		margin-bottom: 0.25em;
		line-height: 1.5;
	}
	.topic-markdown :global(pre) {
		background-color: rgb(39 39 42 / 0.5);
		border-radius: 0.375rem;
		padding: 0.75em 1em;
		margin-bottom: 0.75em;
		overflow-x: auto;
		font-size: 0.85em;
	}
	.topic-markdown :global(code) {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.9em;
	}
	.topic-markdown :global(:not(pre) > code) {
		background-color: rgb(39 39 42 / 0.5);
		padding: 0.15em 0.35em;
		border-radius: 0.25rem;
		color: var(--color-zinc-300);
	}
	.topic-markdown :global(strong) {
		font-weight: 600;
		color: var(--color-zinc-200);
	}
	.topic-markdown :global(a) {
		color: var(--color-blue-400);
		text-decoration: underline;
	}
	.topic-markdown :global(blockquote) {
		border-left: 3px solid rgb(63 63 70);
		padding-left: 1em;
		margin-left: 0;
		margin-bottom: 0.5em;
		color: var(--color-zinc-400);
	}
</style>
