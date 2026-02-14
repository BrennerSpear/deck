<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { TmuxSession, TmuxPane } from '$lib/types';
	import DashboardCard from './DashboardCard.svelte';
	import TerminalPane from '$lib/components/TerminalPane.svelte';

	let { class: className = '' }: { class?: string } = $props();

	let sessions = $state<Record<string, TmuxSession>>({});
	let expandedSession = $state<string | null>(null);
	let sessionPanes = $state<Record<string, TmuxPane[]>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);
	let pollInterval: ReturnType<typeof setInterval>;

	const sessionList = $derived(Object.entries(sessions));

	const subtitle = $derived.by(() => {
		const count = sessionList.length;
		if (count === 0) return '';
		const running = sessionList.filter(([, s]) => s.status === 'running').length;
		return running > 0 ? `${running} running / ${count} total` : `${count} sessions`;
	});

	async function fetchSessions() {
		try {
			const res = await fetch('/api/tmux/sessions');
			if (!res.ok) {
				const payload = await res.json();
				throw new Error(payload.error ?? `HTTP ${res.status}`);
			}
			const data = await res.json();
			sessions = data.sessions ?? {};
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch';
		} finally {
			loading = false;
		}
	}

	async function fetchPanes(sessionName: string) {
		try {
			const res = await fetch(`/api/tmux/panes?session=${encodeURIComponent(sessionName)}`);
			if (!res.ok) return;
			const data = await res.json();
			sessionPanes[sessionName] = data.panes;
		} catch {
			// ignore
		}
	}

	function toggleExpand(name: string) {
		if (expandedSession === name) {
			expandedSession = null;
		} else {
			expandedSession = name;
			fetchPanes(name);
		}
	}

	function statusColor(status: TmuxSession['status']): string {
		switch (status) {
			case 'running':
				return 'bg-green-500';
			case 'idle':
				return 'bg-yellow-500';
			case 'done':
				return 'bg-blue-500';
			case 'killed':
				return 'bg-red-500';
			default:
				return 'bg-zinc-500';
		}
	}

	function agentIcon(agent: 'claude' | 'codex'): string {
		return agent === 'claude' ? '🤖' : '⚡';
	}

	function timeAgo(ts: string): string {
		const diffMs = Date.now() - new Date(ts).getTime();
		if (diffMs < 60_000) return 'just now';
		if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
		if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
		return new Date(ts).toLocaleDateString();
	}

	onMount(() => {
		fetchSessions();
		pollInterval = setInterval(fetchSessions, 3000);
	});

	onDestroy(() => clearInterval(pollInterval));
</script>

<DashboardCard title="Tmux Sessions" {subtitle} class={className}>
	{#if loading}
		<div class="text-sm text-zinc-500">Loading sessions...</div>
	{:else if error}
		<div class="text-sm text-red-400">{error}</div>
	{:else if sessionList.length === 0}
		<div class="text-sm text-zinc-500">No active sessions</div>
	{:else}
		<div class="space-y-1">
			{#each sessionList as [name, session]}
				<div>
					<div
						class="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-zinc-800/40 transition-colors"
						role="button"
						tabindex="0"
						onclick={() => toggleExpand(name)}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(name); }}
					>
						<span class="text-sm">{agentIcon(session.agent)}</span>
						<div class="h-2 w-2 rounded-full flex-shrink-0 {statusColor(session.status)}"></div>
						<span class="text-sm font-medium truncate flex-1">{name}</span>
						<span class="text-[11px] text-zinc-500 truncate max-w-32">{session.repo}</span>
						<span class="text-[11px] text-zinc-600">{timeAgo(session.lastUsed)}</span>
						<span class="text-zinc-600 text-[10px]">{expandedSession === name ? '▼' : '▶'}</span>
					</div>
					{#if expandedSession === name && sessionPanes[name]?.length}
						<div class="mt-1 ml-6 border border-zinc-800 rounded overflow-hidden">
							{#each sessionPanes[name] as pane}
								<TerminalPane paneId={pane.id} width={pane.width} height={pane.height} />
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</DashboardCard>
