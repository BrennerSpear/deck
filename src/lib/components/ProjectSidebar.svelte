<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { projectStore } from '$lib/stores/projects.svelte';
	import type { Project, TmuxSession } from '$lib/types';
	import { getSessionActivityLabel, sessionBelongsToProject } from '$lib/tmux-session-utils';

	let { sidebarCollapsed = $bindable(false) }: { sidebarCollapsed: boolean } = $props();

	let sessions = $state<Record<string, TmuxSession>>({});
	let pollInterval: ReturnType<typeof setInterval> | undefined;

	async function fetchSessions() {
		try {
			const response = await fetch('/api/tmux/sessions');
			if (!response.ok) return;
			const payload = await response.json();
			sessions = payload.sessions ?? {};
		} catch {
			return;
		}
	}

	function getProjectSessionCounts(project: Project) {
		let running = 0;
		let waiting = 0;

		for (const session of Object.values(sessions)) {
			if (session.status !== 'running' && session.status !== 'idle') continue;
			if (!sessionBelongsToProject(session, project.path)) continue;

			const activity = getSessionActivityLabel(session);
			if (activity === 'running') {
				running += 1;
			} else {
				waiting += 1;
			}
		}

		return {
			running,
			waiting,
			open: running + waiting
		};
	}

	function renderDots(count: number): number[] {
		const dotCount = Math.min(count, 4);
		return Array.from({ length: dotCount }, (_, index) => index);
	}

	async function configureReposRoot() {
		const currentRoot = projectStore.reposRoot;
		const nextRoot = prompt('Repos root path', currentRoot);
		if (!nextRoot) return;
		await projectStore.setReposRoot(nextRoot);
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

<aside
	class="flex flex-col border-r border-zinc-800 bg-zinc-925 transition-all duration-200 overflow-hidden"
	class:w-16={sidebarCollapsed}
	class:w-64={!sidebarCollapsed}
>
	<div class="h-14 flex items-center justify-between px-3 border-b border-zinc-800">
		{#if !sidebarCollapsed}
			<span class="font-semibold text-sm">Projects</span>
		{/if}
		<button
			type="button"
			onclick={() => (sidebarCollapsed = !sidebarCollapsed)}
			class="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				{#if sidebarCollapsed}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
				{:else}
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
				{/if}
			</svg>
		</button>
	</div>

	<nav class="flex-1 overflow-y-auto py-2 px-2">
		{#each projectStore.projects as project}
			{@const counts = getProjectSessionCounts(project)}
			<div
				role="button"
				tabindex="0"
				onclick={() => projectStore.selectProject(project.id)}
				onkeydown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						projectStore.selectProject(project.id);
					}
				}}
				class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-colors relative"
				class:bg-zinc-800={projectStore.selectedProjectId === project.id}
				class:text-zinc-100={projectStore.selectedProjectId === project.id}
				class:text-zinc-400={projectStore.selectedProjectId !== project.id}
				class:hover:bg-zinc-850={projectStore.selectedProjectId !== project.id}
				class:hover:text-zinc-200={projectStore.selectedProjectId !== project.id}
			>
				<span class="text-lg flex-shrink-0">{project.icon}</span>
				{#if !sidebarCollapsed}
					<div class="flex flex-col min-w-0 flex-1">
						<span class="truncate text-sm font-medium">{project.name}</span>
						<div class="flex items-center gap-1.5 mt-0.5">
							<div class="flex items-center gap-0.5" title={`${counts.running} running`}>
								{#each renderDots(counts.running) as _}
									<span class="w-2 h-2 rounded-full bg-blue-500"></span>
								{/each}
							</div>
							<div class="flex items-center gap-0.5" title={`${counts.waiting} waiting`}>
								{#each renderDots(counts.waiting) as _}
									<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
								{/each}
							</div>
							{#if counts.open > 0}
								<span class="text-[10px] text-zinc-500 ml-1">{counts.open} open</span>
							{/if}
						</div>
					</div>
					<button
						type="button"
						class="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-700 transition-opacity"
						title="Hide project"
						onclick={(event) => {
							event.stopPropagation();
							projectStore.hideProject(project.id);
						}}
					>
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18M10.584 10.587A2 2 0 0013.414 13.414M9.88 4.24A9.03 9.03 0 0112 4c5 0 9.27 3.11 11 7.5a12.77 12.77 0 01-2.126 3.32M6.53 6.53C4.57 7.94 3.03 9.94 2 12c1.73 4.39 6 7.5 10 7.5a9.1 9.1 0 005.47-1.77" />
						</svg>
					</button>
				{:else}
					{#if counts.open > 0}
						<div class="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
							{#if counts.running > 0}
								<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
							{/if}
							{#if counts.waiting > 0}
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{/each}

		<button
			type="button"
			onclick={() => projectStore.refreshProjects()}
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 transition-colors border border-dashed border-zinc-700 mt-2"
		>
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M20 20v-5h-5M5 9a7 7 0 0112.6-2M19 15a7 7 0 01-12.6 2" />
			</svg>
			{#if !sidebarCollapsed}
				<span class="text-sm">Refresh</span>
			{/if}
		</button>

		{#if !sidebarCollapsed && projectStore.hiddenProjects.length > 0}
			<div class="mt-3 border-t border-zinc-800 pt-2">
				<div class="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-600">Hidden</div>
				{#each projectStore.hiddenProjects as hiddenProject}
					<button
						type="button"
						class="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 text-left text-xs"
						onclick={() => projectStore.unhideProject(hiddenProject.id)}
					>
						<span class="text-sm">{hiddenProject.icon}</span>
						<span class="truncate flex-1">{hiddenProject.name}</span>
						<span class="text-zinc-400">Unhide</span>
					</button>
				{/each}
			</div>
		{/if}
	</nav>

	{#if !sidebarCollapsed}
		<div class="border-t border-zinc-800 p-3 space-y-2">
			<a
				href="/mission-control"
				class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 text-sm transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
				</svg>
				Mission Control
			</a>
			<button
				type="button"
				onclick={configureReposRoot}
				class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 text-sm transition-colors"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Repos Root
			</button>
		</div>
	{/if}
</aside>
