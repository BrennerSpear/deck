<script lang="ts">
	import { projectStore } from '$lib/stores/projects.svelte';

	let { sidebarCollapsed = $bindable(false) }: { sidebarCollapsed: boolean } = $props();

	async function configureReposRoot() {
		const currentRoot = projectStore.reposRoot;
		const nextRoot = prompt('Repos root path', currentRoot);
		if (!nextRoot) return;
		await projectStore.setReposRoot(nextRoot);
	}
</script>

<aside
	class="flex flex-col border-r border-zinc-800 bg-zinc-925 transition-all duration-200 overflow-hidden"
	class:w-16={sidebarCollapsed}
	class:w-56={!sidebarCollapsed}
>
	<!-- Logo/Collapse -->
	<div class="h-14 flex items-center justify-between px-3 border-b border-zinc-800">
		{#if !sidebarCollapsed}
			<span class="font-semibold text-sm">Projects</span>
		{/if}
		<button
			type="button"
			onclick={() => sidebarCollapsed = !sidebarCollapsed}
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

	<!-- Project List -->
	<nav class="flex-1 overflow-y-auto py-2 px-2">
		{#each projectStore.projects as project}
			<button
				type="button"
				onclick={() => projectStore.selectProject(project.id)}
				class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-colors relative"
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
						<span class="truncate text-[10px] text-zinc-500">{project.path}</span>
					</div>
				{/if}
			</button>
		{/each}

		<!-- Refresh Projects -->
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
	</nav>

	<!-- Bottom Actions -->
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
