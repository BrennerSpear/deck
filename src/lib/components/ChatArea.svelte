<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { projectStore } from '$lib/stores/projects.svelte';
	import type { Skill, TmuxPane, TmuxSession } from '$lib/types';
	import TerminalPane from '$lib/components/TerminalPane.svelte';
	import { getSessionActivityLabel, sessionBelongsToProject } from '$lib/tmux-session-utils';

	let sessions = $state<Record<string, TmuxSession>>({});
	let sessionPanes = $state<Record<string, TmuxPane[]>>({});
	let expandedSession = $state<string | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let pollInterval: ReturnType<typeof setInterval> | undefined;

	// Input state
	let chatInput = $state('');
	let skillChain = $state<Skill[]>([]);
	let selectedModel = $state<'codex' | 'claude' | 'kimi'>('codex');
	let modelSelectorOpen = $state(false);
	let inputRef: HTMLTextAreaElement | null = $state(null);
	let isCreatingSession = $state(false);

	const selectedProject = $derived(projectStore.selectedProject);

	const projectSessions = $derived.by(() => {
		if (!selectedProject) return [] as TmuxSession[];

		const result: TmuxSession[] = [];
		for (const session of Object.values(sessions)) {
			if (session.status !== 'running' && session.status !== 'idle') continue;
			if (!sessionBelongsToProject(session, selectedProject.path)) continue;
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

	// Model definitions
	const models: { id: 'codex' | 'claude' | 'kimi'; name: string; icon: string; flag: string }[] = [
		{ id: 'codex', name: 'Codex', icon: '⚡', flag: '--yolo' },
		{ id: 'claude', name: 'Claude', icon: '🤖', flag: '--dangerously-skip-permissions' },
		{ id: 'kimi', name: 'Kimi', icon: '🌙', flag: '--yolo' },
	];

	// Skill data for lookup
	const repoSkills: Skill[] = [
		{ name: 'develop', desc: 'Implement a feature with tests', icon: '🛠️', calls: [] },
		{ name: 'review', desc: 'Code review, test, approve', icon: '👀', calls: [] },
		{ name: 'deploy-staging', desc: 'Ship to staging environment', icon: '🎭', calls: [] },
		{ name: 'deploy-prod', desc: 'Ship to production', icon: '🌐', calls: [] },
		{ name: 'refactor', desc: 'Clean up without changing behavior', icon: '✨', calls: [] },
		{ name: 'debug', desc: 'Find and fix an issue', icon: '🐛', calls: [] },
		{ name: 'feature-flow', desc: 'idea → develop → test → stage → prod', icon: '🔄', calls: ['develop', 'review', 'deploy-staging', 'deploy-prod'] },
		{ name: 'hotfix', desc: 'Fast-track critical fix to prod', icon: '🚨', calls: ['develop', 'deploy-prod'] },
	];

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

	function getSessionStatusLabel(session: TmuxSession): string {
		return getSessionActivityLabel(session) === 'running' ? 'running' : 'waiting for input';
	}

	function getSessionStatusClass(session: TmuxSession): string {
		return getSessionActivityLabel(session) === 'running' ? 'text-emerald-400' : 'text-amber-400';
	}

	function getSessionPreview(session: TmuxSession): string {
		return session.lastLine || session.topic || session.currentCommand || 'No recent output';
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

			if (expandedSession && !sessions[expandedSession]) {
				expandedSession = null;
			}
		} catch (fetchError) {
			error = fetchError instanceof Error ? fetchError.message : 'Failed to load tmux sessions';
		} finally {
			loading = false;
		}
	}

	async function fetchPanes(sessionName: string) {
		try {
			const response = await fetch(`/api/tmux/panes?session=${encodeURIComponent(sessionName)}`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? `Failed to load panes for ${sessionName}`);
			}
			const payload = await response.json();
			sessionPanes[sessionName] = payload.panes ?? [];
		} catch (paneError) {
			error = paneError instanceof Error ? paneError.message : 'Failed to load session panes';
		}
	}

	async function toggleSession(sessionName: string) {
		if (expandedSession === sessionName) {
			expandedSession = null;
			return;
		}

		expandedSession = sessionName;
		await fetchPanes(sessionName);
	}

	// Find skill by name (including global skills)
	async function findSkill(name: string): Promise<Skill | null> {
		// Check repo skills first
		const repoSkill = repoSkills.find(s => s.name === name);
		if (repoSkill) return repoSkill;

		// Try to fetch from global skills
		try {
			const response = await fetch('/api/skills/global');
			if (response.ok) {
				const data = await response.json();
				const globalSkill = data.skills?.find((s: { name: string }) => s.name === name);
				if (globalSkill) {
					return {
						name: globalSkill.name,
						desc: globalSkill.description,
						icon: '🌐',
						calls: []
					};
				}
			}
		} catch {
			// Ignore error
		}

		return null;
	}

	// Select skill - add to chain
	export async function selectSkill(name: string) {
		const skill = await findSkill(name);
		if (skill && !skillChain.some(s => s.name === name)) {
			skillChain = [...skillChain, skill];
			inputRef?.focus();
		}
	}

	function removeSkillFromChain(index: number) {
		skillChain = skillChain.filter((_, i) => i !== index);
	}

	function clearSkillChain() {
		skillChain = [];
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			void createTmuxSession();
		}
	}

	async function createTmuxSession() {
		if (!selectedProject) return;
		if (!chatInput.trim() && skillChain.length === 0) return;

		isCreatingSession = true;

		try {
			// Generate session name based on first skill or input
			const sessionName = skillChain.length > 0 
				? `${selectedProject.name}-${skillChain[0].name}-${Date.now().toString(36).slice(-4)}`
				: `${selectedProject.name}-session-${Date.now().toString(36).slice(-4)}`;

			// Build command with skills as system prompts
			let command = `${selectedModel} --yolo`;
			if (skillChain.length > 0) {
				// Load skill content from SKILL.md files
				const skillPrompts = await Promise.all(
					skillChain.map(async (skill) => {
						try {
							const response = await fetch(`/api/skills/content?name=${encodeURIComponent(skill.name)}`);
							if (response.ok) {
								const data = await response.json();
								return data.content;
							}
						} catch {
							// Fallback to description
						}
						return `${skill.name}: ${skill.desc}`;
					})
				);
				command += ` --system-prompt "${skillPrompts.join('\n\n')}"`;
			}
			if (chatInput.trim()) {
				command += ` "${chatInput.trim()}"`;
			}

			const response = await fetch('/api/tmux/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: sessionName,
					command,
					cwd: selectedProject.path
				})
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? 'Failed to create tmux session');
			}

			// Clear input and skill chain after successful creation
			chatInput = '';
			skillChain = [];

			// Refresh sessions
			await fetchSessions();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create tmux session';
		} finally {
			isCreatingSession = false;
		}
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
							<div class="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
								<button
									type="button"
									class="w-full px-3 py-2.5 text-left hover:bg-zinc-850/70 transition-colors"
									onclick={() => toggleSession(session.name)}
								>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<div class="flex items-center gap-2 text-sm">
												<span>{getAgentIcon(session.agent)}</span>
												<span class="font-medium truncate">{session.name}</span>
											</div>
											<div class="text-xs text-zinc-400 truncate mt-1">{getSessionPreview(session)}</div>
											<div class="text-[11px] text-zinc-500 truncate mt-1">{session.repo}</div>
										</div>
										<div class="text-right flex-shrink-0">
											<div class="text-[11px] {getSessionStatusClass(session)}">{getSessionStatusLabel(session)}</div>
											<div class="text-[11px] text-zinc-500">{formatRelativeTime(session.lastUsed)}</div>
										</div>
									</div>
								</button>

								{#if expandedSession === session.name}
									<div class="border-t border-zinc-800 p-3 bg-zinc-950 space-y-3">
										{#if sessionPanes[session.name]?.length > 0}
											{#each sessionPanes[session.name] as pane}
												<div class="rounded-md border border-zinc-800 overflow-hidden">
													<div class="px-3 py-1.5 text-[11px] bg-zinc-900 border-b border-zinc-800 text-zinc-400 flex items-center justify-between">
														<span>Pane {pane.id}</span>
														<span>{pane.currentCommand}</span>
													</div>
													<TerminalPane paneId={pane.id} width={pane.width} height={pane.height} />
												</div>
											{/each}
										{:else}
											<div class="text-xs text-zinc-500">No panes found.</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				{#if idleSessions.length > 0}
					<div class="space-y-2">
						<div class="text-xs uppercase tracking-wider text-zinc-500">Idle ({idleSessions.length})</div>
						{#each idleSessions as session}
							<div class="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
								<button
									type="button"
									class="w-full px-3 py-2.5 text-left hover:bg-zinc-850/70 transition-colors"
									onclick={() => toggleSession(session.name)}
								>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0">
											<div class="flex items-center gap-2 text-sm">
												<span>{getAgentIcon(session.agent)}</span>
												<span class="font-medium truncate">{session.name}</span>
											</div>
											<div class="text-xs text-zinc-400 truncate mt-1">{getSessionPreview(session)}</div>
											<div class="text-[11px] text-zinc-500 truncate mt-1">{session.repo}</div>
										</div>
										<div class="text-right flex-shrink-0">
											<div class="text-[11px] {getSessionStatusClass(session)}">{getSessionStatusLabel(session)}</div>
											<div class="text-[11px] text-zinc-500">{formatRelativeTime(session.lastUsed)}</div>
										</div>
									</div>
								</button>

								{#if expandedSession === session.name}
									<div class="border-t border-zinc-800 p-3 bg-zinc-950 space-y-3">
										{#if sessionPanes[session.name]?.length > 0}
											{#each sessionPanes[session.name] as pane}
												<div class="rounded-md border border-zinc-800 overflow-hidden">
													<div class="px-3 py-1.5 text-[11px] bg-zinc-900 border-b border-zinc-800 text-zinc-400 flex items-center justify-between">
														<span>Pane {pane.id}</span>
														<span>{pane.currentCommand}</span>
													</div>
													<TerminalPane paneId={pane.id} width={pane.width} height={pane.height} />
												</div>
											{/each}
										{:else}
											<div class="text-xs text-zinc-500">No panes found.</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Terminal Input Box -->
	{#if selectedProject}
		<div class="border-t border-zinc-800 bg-zinc-925 p-4">
			<div class="flex items-center gap-2">
				<div class="flex-1 relative flex items-center bg-zinc-950 border border-zinc-700 rounded-lg font-mono focus-within:ring-1 focus-within:ring-violet-400 focus-within:border-violet-400">
					<!-- Terminal prompt -->
					<span class="pl-3 text-violet-400 text-sm select-none">❯</span>
					
					<!-- Inline skill bubbles -->
					{#if skillChain.length > 0}
						<div class="flex items-center gap-1 pl-2 flex-shrink-0">
							{#each skillChain as skill, i}
								<div 
									class="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
									class:bg-violet-400={i === 0}
									class:text-zinc-950={i === 0}
									class:bg-zinc-800={i > 0}
									class:text-zinc-300={i > 0}
								>
									<span>{skill.icon}</span>
									<span class="font-medium">{skill.name}</span>
									<button 
										onclick={() => removeSkillFromChain(i)}
										class="ml-0.5 hover:text-zinc-100"
										type="button"
										aria-label="Remove skill"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
								{#if i < skillChain.length - 1}
									<svg class="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
							{/each}
						</div>
					{/if}

					<textarea
						bind:this={inputRef}
						bind:value={chatInput}
						onkeydown={handleKeydown}
						placeholder={skillChain.length > 0 ? 'Add context...' : 'Enter command or press Enter to create session...'}
						rows="1"
						disabled={isCreatingSession}
						class="flex-1 bg-transparent px-2 py-2.5 text-sm resize-none focus:outline-none placeholder:text-zinc-600 font-mono disabled:opacity-50"
					></textarea>
				</div>

				<button 
					onclick={createTmuxSession}
					disabled={isCreatingSession || (!chatInput.trim() && skillChain.length === 0)}
					class="px-4 py-2.5 rounded-lg bg-violet-400 hover:bg-violet-300 disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-950 text-sm font-medium transition-colors flex items-center gap-2"
					type="button"
				>
					{#if isCreatingSession}
						<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Creating...
					{:else}
						Send
						<kbd class="text-zinc-700 text-xs">↵</kbd>
					{/if}
				</button>
			</div>

			<!-- Status bar -->
			<div class="flex items-center justify-between mt-2 px-1 text-[11px] font-mono text-zinc-500">
				<div class="flex items-center gap-3">
					{#if isCreatingSession}
						<span class="text-blue-400">creating session...</span>
					{:else}
						<span class="text-emerald-400">ready</span>
					{/if}
					<span class="text-zinc-600">│</span>
					<div class="relative">
						<button 
							onclick={() => modelSelectorOpen = !modelSelectorOpen}
							class="flex items-center gap-1 hover:text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded"
							type="button"
						>
							<span>{models.find(m => m.id === selectedModel)?.icon}</span>
							<span>{models.find(m => m.id === selectedModel)?.name}</span>
							<svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{#if modelSelectorOpen}
							<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
							<div 
								class="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[160px]"
								onclick={(e) => e.stopPropagation()}
							>
								{#each models as model}
									<button
										onclick={() => { selectedModel = model.id; modelSelectorOpen = false; }}
										class="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 flex items-center gap-2"
										class:text-violet-400={selectedModel === model.id}
										class:text-zinc-300={selectedModel !== model.id}
										type="button"
									>
										<span>{model.icon}</span>
										<span>{model.name}</span>
										{#if selectedModel === model.id}
											<span class="ml-auto text-[10px]">{model.flag}</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
				<div class="flex items-center gap-3">
					<span>{skillChain.length} skill{skillChain.length === 1 ? '' : 's'}</span>
				</div>
			</div>
		</div>
	{/if}
</section>

<!-- Click outside to close model selector -->
{#if modelSelectorOpen}
	<div class="fixed inset-0 z-40" onclick={() => modelSelectorOpen = false} role="presentation"></div>
{/if}
