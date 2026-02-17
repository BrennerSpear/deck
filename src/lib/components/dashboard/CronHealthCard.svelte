<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { marked } from 'marked';
	import DashboardCard from './DashboardCard.svelte';

	interface CronJob {
		id: string;
		name: string;
		enabled: boolean;
		schedule: string;
		lastRun?: string;
		lastStatus?: 'ok' | 'error' | 'skip' | null;
		consecutiveErrors: number;
		lastError?: string | null;
		model?: string | null;
		systemPrompt?: string | null;
	}

	let { class: className = '' }: { class?: string } = $props();

	let jobs = $state<CronJob[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let expandedJobId = $state<string | null>(null);
	let pollInterval: ReturnType<typeof setInterval>;

	const sorted = $derived.by(() => {
		return [...jobs].sort((a, b) => {
			// Errors first
			if (a.lastStatus === 'error' && b.lastStatus !== 'error') return -1;
			if (b.lastStatus === 'error' && a.lastStatus !== 'error') return 1;
			// Then enabled before disabled
			if (a.enabled && !b.enabled) return -1;
			if (b.enabled && !a.enabled) return 1;
			return a.name.localeCompare(b.name);
		});
	});

	const stats = $derived.by(() => {
		const errorCount = jobs.filter((j) => j.lastStatus === 'error').length;
		const okCount = jobs.filter((j) => j.lastStatus === 'ok').length;
		const total = jobs.length;
		return { errorCount, okCount, total };
	});

	const subtitle = $derived.by(() => {
		if (stats.errorCount > 0) return `${stats.errorCount} error${stats.errorCount > 1 ? 's' : ''} · ${stats.total} jobs`;
		if (stats.total === 0) return '';
		return `${stats.okCount} healthy · ${stats.total} jobs`;
	});

	function renderMarkdown(text: string): string {
		return marked.parse(text, { breaks: true }) as string;
	}

	function toggleExpanded(jobId: string) {
		expandedJobId = expandedJobId === jobId ? null : jobId;
	}

	async function fetchJobs() {
		try {
			const res = await fetch('/api/openclaw/cron');
			if (!res.ok) {
				const payload = await res.json();
				throw new Error(payload.error ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			jobs = Array.isArray(data) ? data : data.jobs ?? [];
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch';
		} finally {
			loading = false;
		}
	}

	function statusColor(job: CronJob): string {
		if (!job.enabled) return 'bg-zinc-600';
		switch (job.lastStatus) {
			case 'ok':
				return 'bg-emerald-500';
			case 'error':
				return 'bg-red-500';
			case 'skip':
				return 'bg-amber-500';
			default:
				return 'bg-zinc-500';
		}
	}

	function statusGlow(job: CronJob): string {
		if (!job.enabled) return '';
		if (job.lastStatus === 'error') return 'shadow-[0_0_6px_rgba(239,68,68,0.5)]';
		if (job.lastStatus === 'ok') return 'shadow-[0_0_6px_rgba(16,185,129,0.4)]';
		return '';
	}

	function formatTime(ts?: string): string {
		if (!ts) return '—';
		const d = new Date(ts);
		const now = Date.now();
		const diffMs = now - d.getTime();
		if (diffMs < 60_000) return 'just now';
		if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
		if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
		return `${Math.floor(diffMs / 86_400_000)}d ago`;
	}

	onMount(() => {
		fetchJobs();
		pollInterval = setInterval(fetchJobs, 10_000);
	});

	onDestroy(() => clearInterval(pollInterval));
</script>

<DashboardCard title="Cron Health" {subtitle} class={className}>
	{#if loading}
		<div class="text-sm text-zinc-500">Loading cron jobs...</div>
	{:else if error}
		<div class="text-sm text-red-400">{error}</div>
	{:else if sorted.length === 0}
		<div class="text-sm text-zinc-500">No cron jobs configured</div>
	{:else}
		<div class="space-y-0.5">
			{#each sorted as job}
				<div>
					<button
						type="button"
						class="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors w-full text-left {expandedJobId === job.id ? 'bg-zinc-800/30' : ''}"
						title={job.lastError ?? ''}
						onclick={() => toggleExpanded(job.id)}
					>
						<div class="h-2.5 w-2.5 rounded-full flex-shrink-0 {statusColor(job)} {statusGlow(job)}"></div>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span class="text-sm font-medium truncate" class:text-zinc-500={!job.enabled}>{job.name}</span>
								{#if job.consecutiveErrors > 0}
									<span class="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-medium">{job.consecutiveErrors}× fail</span>
								{/if}
								{#if job.systemPrompt}
									<svg class="w-3.5 h-3.5 text-zinc-600 transition-transform {expandedJobId === job.id ? 'rotate-90' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
							</div>
							{#if job.lastError && job.lastStatus === 'error'}
								<div class="text-[11px] text-red-400/70 truncate mt-0.5">{job.lastError}</div>
							{/if}
						</div>
						<div class="flex items-center gap-4 flex-shrink-0">
							<span class="text-[11px] text-zinc-500">{job.schedule}</span>
							<span class="text-[11px] text-zinc-600 w-14 text-right">{formatTime(job.lastRun)}</span>
						</div>
					</button>
					{#if expandedJobId === job.id && job.systemPrompt}
						<div class="px-4 py-3 border-t border-zinc-800/50 bg-zinc-950/50 rounded-b-lg mx-1 mb-1">
							<div class="text-xs text-zinc-500 mb-2 font-medium">System Prompt</div>
							<div class="cron-markdown text-sm text-zinc-300 max-w-none">
								{@html renderMarkdown(job.systemPrompt)}
							</div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</DashboardCard>

<style>
	.cron-markdown :global(h1),
	.cron-markdown :global(h2),
	.cron-markdown :global(h3),
	.cron-markdown :global(h4) {
		font-weight: 600;
		margin-top: 1em;
		margin-bottom: 0.5em;
		color: var(--color-zinc-200);
	}
	.cron-markdown :global(h1) {
		font-size: 1.1em;
	}
	.cron-markdown :global(h2) {
		font-size: 1em;
	}
	.cron-markdown :global(h3),
	.cron-markdown :global(h4) {
		font-size: 0.9em;
	}
	.cron-markdown :global(p) {
		margin-bottom: 0.5em;
		line-height: 1.6;
	}
	.cron-markdown :global(ul),
	.cron-markdown :global(ol) {
		padding-left: 1.5em;
		margin-bottom: 0.5em;
	}
	.cron-markdown :global(ul) {
		list-style-type: disc;
	}
	.cron-markdown :global(ol) {
		list-style-type: decimal;
	}
	.cron-markdown :global(li) {
		margin-bottom: 0.25em;
		line-height: 1.5;
	}
	.cron-markdown :global(pre) {
		background-color: rgb(39 39 42 / 0.5);
		border-radius: 0.375rem;
		padding: 0.75em 1em;
		margin-bottom: 0.75em;
		overflow-x: auto;
		font-size: 0.85em;
	}
	.cron-markdown :global(code) {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
		font-size: 0.9em;
	}
	.cron-markdown :global(:not(pre) > code) {
		background-color: rgb(39 39 42 / 0.5);
		padding: 0.15em 0.35em;
		border-radius: 0.25rem;
		color: var(--color-zinc-300);
	}
	.cron-markdown :global(strong) {
		font-weight: 600;
		color: var(--color-zinc-200);
	}
	.cron-markdown :global(a) {
		color: var(--color-blue-400);
		text-decoration: underline;
	}
	.cron-markdown :global(blockquote) {
		border-left: 3px solid rgb(63 63 70);
		padding-left: 1em;
		margin-left: 0;
		margin-bottom: 0.5em;
		color: var(--color-zinc-400);
	}
</style>
