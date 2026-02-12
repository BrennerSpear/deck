<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { projectStore } from '$lib/stores/projects.svelte';
	import type { TmuxSession } from '$lib/types';

	let sessions = $state<Record<string, TmuxSession>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);
	let pollInterval: ReturnType<typeof setInterval> | undefined;

	const selectedProject = $derived(projectStore.selectedProject);

	const projectSessions = $derived.by(() => {
		if (!selectedProject) return [] as TmuxSession[];

		const result: TmuxSession[] = [];
		for (const session of Object.values(sessions)) {
			if (session.status !== 'running' && session.status !== 'idle') continue;
			if (!belongsToProject(session, selectedProject.path)) continue;
			result.push(session);
		}

		result.sort((left, right) => {
			if (left.status !== right.status) {
				return left.status === 'running' ? -1 : 1;
			}
			return new Date(right.lastUsed).getTime() - new Date(left.lastUsed).getTime();
		});

		return result;
	});

	const runningSessions = $derived(projectSessions.filter((session) => session.status === 'running'));
	const idleSessions = $derived(projectSessions.filter((session) => session.status === 'idle'));

	function normalizePath(input: string): string {
		return input.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
	}

	function getFolderName(input: string): string {
		const normalized = normalizePath(input);
		const parts = normalized.split('/').filter(Boolean);
		return parts[parts.length - 1] ?? normalized;
	}

	function belongsToProject(session: TmuxSession, projectPath: string): boolean {
		const normalizedProjectPath = normalizePath(projectPath);
		const normalizedRepoPath = normalizePath(session.repo || '');

		if (normalizedRepoPath === normalizedProjectPath) return true;
		if (normalizedRepoPath.startsWith(`${normalizedProjectPath}/`)) return true;

		return getFolderName(normalizedRepoPath) === getFolderName(normalizedProjectPath);
	}

	function formatRelativeTime(timestamp: string): string {
		const deltaMs = Date.now() - new Date(timestamp).getTime();
		const deltaMinutes = Math.floor(deltaMs / (60 * 1000));
		if (deltaMinutes < 1) return 'just now';
		if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
		const deltaHours = Math.floor(deltaMinutes / 60);
		if (deltaHours < 24) return `${deltaHours}h ago`;
		const deltaDays = Math.floor(deltaHours / 24);
		return `${deltaDays}d ago`;
	}

	function getAgentIcon(agent: 'claude' | 'codex'): string {
		return agent === 'codex' ? '⚡' : '🤖';
	}

	async function fetchSessions() {
		try {
			const response = await fetch('/api/tmux/sessions');
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? 'Failed to load tmux sessions');
			}

			const payload = await response.json();
			sessions = payload.sessions ?? {};
			error = null;
		} catch (fetchError) {
			error = fetchError instanceof Error ? fetchError.message : 'Failed to load tmux sessions';
		} finally {
			loading = false;
		}
	}

	// Kept for compatibility with existing parent wiring.
	export function selectSkill(_name: string) {
		return;
	}

	onMount(() => {
		void fetchSessions();
		pollInterval = setInterval(() => {
			void fetchSessions();
		}, 2000);
	});

	onDestroy(() => {
		if (pollInterval) clearInterval(pollInterval);
	});
</script>

<section class="flex-1 flex flex-col overflow-hidden min-w-0">
	<header class="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-925/30">
		<div class="flex items-center gap-3">
			<div class="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300">⌘</div>
			<div>
				<div class="text-sm font-medium">Project Sessions</div>
				<div class="text-xs text-zinc-500 truncate max-w-96">
					{selectedProject ? selectedProject.path : 'Select a project'}
				</div>
			</div>
		</div>
		<a
			href="/mission-control"
			class="text-xs px-3 py-1.5 rounded-md border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors"
		>
			Open Mission Control
		</a>
	</header>

	<div class="flex-1 overflow-y-auto p-4">
		{#if loading}
			<div class="h-full flex items-center justify-center text-zinc-500 text-sm">Loading tmux sessions...</div>
		{:else if error}
			<div class="h-full flex items-center justify-center text-red-400 text-sm">{error}</div>
		{:else if !selectedProject}
			<div class="h-full flex items-center justify-center text-zinc-500 text-sm">No project selected.</div>
		{:else if projectSessions.length === 0}
			<div class="h-full flex items-center justify-center text-zinc-500 text-sm">
				No running or idle tmux sessions for {selectedProject.name}.
			</div>
		{:else}
			<div class="space-y-6">
				{#if runningSessions.length > 0}
					<div class="space-y-2">
						<div class="text-xs uppercase tracking-wider text-zinc-500">Running ({runningSessions.length})</div>
						{#each runningSessions as session}
							<div class="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<div class="flex items-center gap-2 text-sm">
											<span>{getAgentIcon(session.agent)}</span>
											<span class="font-medium truncate">{session.name}</span>
										</div>
										<div class="text-xs text-zinc-500 truncate mt-1">{session.repo}</div>
										{#if session.topic}
											<div class="text-xs text-zinc-400 mt-1 truncate">{session.topic}</div>
										{/if}
									</div>
									<div class="text-right flex-shrink-0">
										<div class="text-[11px] text-emerald-400">running</div>
										<div class="text-[11px] text-zinc-500">{formatRelativeTime(session.lastUsed)}</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				{#if idleSessions.length > 0}
					<div class="space-y-2">
						<div class="text-xs uppercase tracking-wider text-zinc-500">Idle ({idleSessions.length})</div>
						{#each idleSessions as session}
							<div class="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5">
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0">
										<div class="flex items-center gap-2 text-sm">
											<span>{getAgentIcon(session.agent)}</span>
											<span class="font-medium truncate">{session.name}</span>
										</div>
										<div class="text-xs text-zinc-500 truncate mt-1">{session.repo}</div>
										{#if session.topic}
											<div class="text-xs text-zinc-400 mt-1 truncate">{session.topic}</div>
										{/if}
									</div>
									<div class="text-right flex-shrink-0">
										<div class="text-[11px] text-amber-400">idle</div>
										<div class="text-[11px] text-zinc-500">{formatRelativeTime(session.lastUsed)}</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
