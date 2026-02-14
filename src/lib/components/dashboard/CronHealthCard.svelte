<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { CronJob } from '$lib/types';
	import DashboardCard from './DashboardCard.svelte';

	let { class: className = '' }: { class?: string } = $props();

	let jobs = $state<CronJob[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
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

	const subtitle = $derived.by(() => {
		const errorCount = jobs.filter((j) => j.lastStatus === 'error').length;
		if (errorCount > 0) return `${errorCount} error${errorCount > 1 ? 's' : ''}`;
		if (jobs.length === 0) return '';
		return `${jobs.length} jobs`;
	});

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
				return 'bg-green-500';
			case 'error':
				return 'bg-red-500';
			case 'skip':
				return 'bg-yellow-500';
			default:
				return 'bg-zinc-500';
		}
	}

	function formatTime(ts?: string): string {
		if (!ts) return 'never';
		const d = new Date(ts);
		const now = Date.now();
		const diffMs = now - d.getTime();
		if (diffMs < 60_000) return 'just now';
		if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
		if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
		return d.toLocaleDateString();
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
		<div class="space-y-1.5">
			{#each sorted as job}
				<div class="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-zinc-800/40 transition-colors">
					<div class="h-2 w-2 rounded-full flex-shrink-0 {statusColor(job)}"></div>
					<span class="text-sm flex-1 truncate" class:text-zinc-500={!job.enabled}>{job.name}</span>
					<span class="text-[11px] text-zinc-500 font-mono">{job.schedule}</span>
					<span class="text-[11px] text-zinc-500 w-16 text-right">{formatTime(job.lastRun)}</span>
					{#if job.consecutiveErrors > 0}
						<span class="text-[11px] text-red-400 font-medium">{job.consecutiveErrors}x</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</DashboardCard>
