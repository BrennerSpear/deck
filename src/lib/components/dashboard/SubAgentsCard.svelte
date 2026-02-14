<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { SubAgent } from '$lib/types';
	import DashboardCard from './DashboardCard.svelte';

	let { class: className = '' }: { class?: string } = $props();

	let agents = $state<SubAgent[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let pollInterval: ReturnType<typeof setInterval>;

	const subtitle = $derived(agents.length > 0 ? `${agents.length} active` : '');

	async function fetchAgents() {
		try {
			const res = await fetch('/api/openclaw/sessions?active=30');
			if (!res.ok) {
				const payload = await res.json();
				throw new Error(payload.error ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			const all: SubAgent[] = Array.isArray(data) ? data : data.sessions ?? [];
			agents = all.filter((s) => s.kind === 'subagent' || s.kind === 'sub-agent');
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch';
		} finally {
			loading = false;
		}
	}

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
		return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
	}

	function formatTokens(n: number): string {
		if (n < 1000) return `${n}`;
		if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
		return `${(n / 1_000_000).toFixed(1)}M`;
	}

	onMount(() => {
		fetchAgents();
		pollInterval = setInterval(fetchAgents, 10_000);
	});

	onDestroy(() => clearInterval(pollInterval));
</script>

<DashboardCard title="Sub-Agents" {subtitle} class={className}>
	{#if loading}
		<div class="text-sm text-zinc-500">Loading sub-agents...</div>
	{:else if error}
		<div class="text-sm text-red-400">{error}</div>
	{:else if agents.length === 0}
		<div class="text-sm text-zinc-500">No active sub-agents</div>
	{:else}
		<div class="space-y-1.5">
			{#each agents as agent}
				<div class="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-zinc-800/40 transition-colors">
					<span class="text-sm font-medium truncate flex-1">{agent.sessionKey}</span>
					<span class="text-[11px] text-zinc-500 font-mono">{agent.model}</span>
					<span class="text-[11px] text-zinc-500">{formatTokens(agent.tokensUsed)} tok</span>
					<span class="text-[11px] text-zinc-500">{formatDuration(agent.duration)}</span>
					<span class="text-[11px] capitalize" class:text-green-400={agent.status === 'running'} class:text-zinc-500={agent.status !== 'running'}>{agent.status}</span>
				</div>
			{/each}
		</div>
	{/if}
</DashboardCard>
