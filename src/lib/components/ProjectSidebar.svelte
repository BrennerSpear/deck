<script lang="ts">
	import { projectStore } from '$lib/stores/projects.svelte';
	import type { Conversation } from '$lib/types';

	let { sidebarCollapsed = $bindable(false) }: { sidebarCollapsed: boolean } = $props();

	function getProjectConvCounts(projectId: string) {
		const convs = projectStore.getProjectConversations(projectId);
		return {
			working: convs.filter((c: Conversation) => c.status === 'working').length,
			waiting: convs.filter((c: Conversation) => c.status === 'waiting').length,
			done: convs.filter((c: Conversation) => c.status === 'done').length,
		};
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
			{@const counts = getProjectConvCounts(project.id)}
			<button
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
					<span class="truncate text-sm font-medium flex-1">{project.name}</span>
					<!-- Conversation status dots -->
					{#if counts.working > 0 || counts.waiting > 0 || counts.done > 0}
						<div class="flex items-center gap-0.5 ml-auto">
							{#each Array(counts.working) as _}
								<span class="w-2 h-2 rounded-full bg-blue-500"></span>
							{/each}
							{#each Array(counts.waiting + counts.done) as _}
								<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
							{/each}
						</div>
					{/if}
				{:else}
					<!-- Collapsed: show dots below icon -->
					{#if counts.working > 0 || counts.waiting > 0 || counts.done > 0}
						<div class="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
							{#each Array(counts.working) as _}
								<span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
							{/each}
							{#each Array(counts.waiting + counts.done) as _}
								<span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
							{/each}
						</div>
					{/if}
				{/if}
			</button>
		{/each}

		<!-- Add Project Button -->
		<button
			onclick={() => projectStore.addProjectViaDialog()}
			class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left text-zinc-500 hover:text-zinc-300 hover:bg-zinc-850 transition-colors border border-dashed border-zinc-700 mt-2"
		>
			<svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			{#if !sidebarCollapsed}
				<span class="text-sm">Add Project</span>
			{/if}
		</button>
	</nav>

	<!-- Global Config -->
	{#if !sidebarCollapsed}
		<div class="border-t border-zinc-800 p-3">
			<button class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 text-sm">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				Global Config
			</button>
		</div>
	{/if}
</aside>
