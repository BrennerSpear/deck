<script lang="ts">
	import '../../app.css';
	import { onMount, onDestroy } from 'svelte';
	import type { TmuxSession, TmuxPane, AgentEvent } from '$lib/types';
	import TerminalPane from '$lib/components/TerminalPane.svelte';

	// State
	let sessions = $state<Record<string, TmuxSession>>({});
	let expandedSession = $state<string | null>(null);
	let sessionPanes = $state<Record<string, TmuxPane[]>>({});
	let events = $state<AgentEvent[]>([]);
	let lastEventCheck = $state<string>(new Date().toISOString());
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Polling intervals
	let sessionPollInterval: ReturnType<typeof setInterval>;
	let eventPollInterval: ReturnType<typeof setInterval>;

	// Fetch sessions
	async function fetchSessions() {
		try {
			const response = await fetch('/api/tmux/sessions');
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? 'Failed to fetch sessions');
			}
			const data = await response.json();
			sessions = data.sessions;
			error = null;
			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch sessions';
			loading = false;
		}
	}

	// Fetch panes for a session
	async function fetchPanes(sessionName: string) {
		try {
			const response = await fetch(`/api/tmux/panes?session=${encodeURIComponent(sessionName)}`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? `Failed to fetch panes for ${sessionName}`);
			}
			const data = await response.json();
			sessionPanes[sessionName] = data.panes;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to fetch panes';
		}
	}

	// Fetch events
	async function fetchEvents() {
		try {
			const response = await fetch(`/api/tmux/events?since=${encodeURIComponent(lastEventCheck)}`);
			const data = await response.json();
			if (data.events.length > 0) {
				events = [...data.events, ...events].slice(0, 50); // Keep last 50 events
				lastEventCheck = new Date().toISOString();
			}
		} catch (e) {
			console.error('Failed to fetch events:', e);
		}
	}

	// Kill a session
	async function killSession(sessionName: string) {
		if (!confirm(`Kill session "${sessionName}"?`)) return;

		try {
			const response = await fetch(`/api/tmux/sessions?name=${encodeURIComponent(sessionName)}`, {
				method: 'DELETE'
			});
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? `Failed to kill session "${sessionName}"`);
			}
			delete sessions[sessionName];
			if (expandedSession === sessionName) {
				expandedSession = null;
			}
			await fetchSessions();
		} catch (e) {
			alert(`Failed to kill session: ${e instanceof Error ? e.message : 'Unknown error'}`);
		}
	}

	// Toggle session expansion
	async function toggleSession(sessionName: string) {
		if (expandedSession === sessionName) {
			expandedSession = null;
		} else {
			expandedSession = sessionName;
			await fetchPanes(sessionName);
		}
	}

	// Get status color
	function getStatusColor(status: TmuxSession['status']): string {
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

	// Get agent icon
	function getAgentIcon(agent: 'claude' | 'codex'): string {
		return agent === 'claude' ? '🤖' : '⚡';
	}

	// Format timestamp
	function formatTime(timestamp: string): string {
		return new Date(timestamp).toLocaleString();
	}

	onMount(() => {
		fetchSessions();
		fetchEvents();

		// Poll sessions every 2 seconds
		sessionPollInterval = setInterval(fetchSessions, 2000);

		// Poll events every 1 second
		eventPollInterval = setInterval(fetchEvents, 1000);
	});

	onDestroy(() => {
		clearInterval(sessionPollInterval);
		clearInterval(eventPollInterval);
	});
</script>

<div class="h-screen flex flex-col bg-zinc-950 text-zinc-100">
	<!-- Header -->
	<header class="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900">
		<div class="flex items-center gap-3">
			<a href="/" class="text-zinc-400 hover:text-zinc-100 transition-colors">←</a>
			<h1 class="text-xl font-semibold">Agent Mission Control</h1>
			<div class="h-2 w-2 rounded-full bg-violet-400 animate-pulse"></div>
		</div>
		<div class="text-sm text-zinc-400">
			{Object.keys(sessions).length} session{Object.keys(sessions).length !== 1 ? 's' : ''}
		</div>
	</header>

	<!-- Main Content -->
	<main class="flex-1 flex overflow-hidden">
		<!-- Sessions Grid -->
		<div class="flex-1 overflow-y-auto p-6">
			{#if loading}
				<div class="flex items-center justify-center h-full">
					<div class="text-zinc-400">Loading sessions...</div>
				</div>
			{:else if error}
				<div class="flex items-center justify-center h-full">
					<div class="text-red-400">{error}</div>
				</div>
			{:else if Object.keys(sessions).length === 0}
				<div class="flex flex-col items-center justify-center h-full gap-4">
					<div class="text-6xl">🦎</div>
					<div class="text-zinc-400">No active tmux sessions</div>
					<div class="text-sm text-zinc-500">Sessions will appear here when agents are running</div>
				</div>
			{:else}
				<div class="grid grid-cols-1 gap-4">
					{#each Object.entries(sessions) as [sessionName, session]}
						<div class="border border-zinc-800 rounded-lg bg-zinc-900 overflow-hidden">
							<!-- Session Header -->
							<div
								class="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors text-left cursor-pointer"
								role="button"
								tabindex="0"
								onclick={() => toggleSession(sessionName)}
								onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleSession(sessionName); }}
							>
								<div class="flex items-center gap-3 flex-1">
									<div class="text-2xl">{getAgentIcon(session.agent)}</div>
									<div class="flex-1">
										<div class="font-medium">{sessionName}</div>
										<div class="text-sm text-zinc-400">{session.repo}</div>
										{#if session.topic}
											<div class="text-xs text-zinc-500 mt-1">{session.topic}</div>
										{/if}
									</div>
									<div class="flex items-center gap-2">
										<div class="flex items-center gap-2">
											<div class="h-2 w-2 rounded-full {getStatusColor(session.status)}"></div>
											<span class="text-sm text-zinc-400 capitalize">{session.status}</span>
										</div>
										<div class="text-xs text-zinc-500">
											{formatTime(session.lastUsed)}
										</div>
									</div>
								</div>
								<div class="flex items-center gap-2 ml-4">
									<button
										type="button"
										class="px-3 py-1 text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded transition-colors"
										onclick={(e) => {
											e.stopPropagation();
											killSession(sessionName);
										}}
									>
										Kill
									</button>
									<div class="text-zinc-500">
										{expandedSession === sessionName ? '▼' : '▶'}
									</div>
								</div>
							</div>

							<!-- Panes (when expanded) -->
							{#if expandedSession === sessionName}
								<div class="border-t border-zinc-800 p-4 bg-zinc-950">
									{#if sessionPanes[sessionName]?.length > 0}
										<div class="grid grid-cols-1 gap-4">
											{#each sessionPanes[sessionName] as pane}
												<div class="border border-zinc-800 rounded overflow-hidden">
													<div
														class="px-3 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400 flex items-center justify-between"
													>
														<span>Pane {pane.id}</span>
														<span class="truncate max-w-80 text-right">
															{pane.currentPath ? `${pane.currentCommand} · ${pane.currentPath}` : pane.currentCommand}
														</span>
													</div>
													<TerminalPane paneId={pane.id} width={pane.width} height={pane.height} />
												</div>
											{/each}
										</div>
									{:else}
										<div class="text-sm text-zinc-500">No panes found</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Events Sidebar -->
		<aside class="w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col">
			<div class="px-4 py-3 border-b border-zinc-800">
				<h2 class="font-medium text-sm">Team Events</h2>
			</div>
			<div class="flex-1 overflow-y-auto">
				{#if events.length === 0}
					<div class="p-4 text-sm text-zinc-500">No recent events</div>
				{:else}
					<div class="divide-y divide-zinc-800">
						{#each events as event}
							<div class="p-3">
								<div class="flex items-start gap-2">
									<div class="text-lg">
										{event.type === 'teammate-idle' ? '💤' : '✅'}
									</div>
									<div class="flex-1">
										<div class="text-sm">{event.message}</div>
										{#if event.agent}
											<div class="text-xs text-zinc-500 mt-1">Agent: {event.agent}</div>
										{/if}
										<div class="text-xs text-zinc-600 mt-1">{formatTime(event.timestamp)}</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</aside>
	</main>
</div>
