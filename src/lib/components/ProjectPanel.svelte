<script lang="ts">
	import { slide } from 'svelte/transition';
	import { projectStore } from '$lib/stores/projects.svelte';
	import PlaybookTree from './PlaybookTree.svelte';
	import type { Skill } from '$lib/types';

	let {
		configExpanded = $bindable(true),
		skillsExpanded = $bindable(true),
		changesExpanded = $bindable(true),
		onSelectSkill,
	}: {
		configExpanded: boolean;
		skillsExpanded: boolean;
		changesExpanded: boolean;
		onSelectSkill?: (name: string) => void;
	} = $props();

	// Skills data
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

	const globalSkills: Skill[] = [
		{ name: 'research', desc: 'Deep investigation on a topic', icon: '🔍', calls: [] },
		{ name: 'summarize', desc: 'Condense content into key points', icon: '📝', calls: [] },
		{ name: 'explain', desc: 'Break down complex concepts', icon: '💡', calls: [] },
	];

	// Mock changed files (from main branch)
	const changedFiles = [
		{ name: 'src/lib/chat.ts', additions: 45, deletions: 12 },
		{ name: 'src/routes/+page.svelte', additions: 120, deletions: 0 },
		{ name: 'package.json', additions: 3, deletions: 1 },
	];

	let hoveredSkill = $state<string | null>(null);
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

	// Derived
	const selectedProject = $derived(projectStore.selectedProject);
	const fileTree = $derived(selectedProject ? projectStore.getProjectTree(selectedProject.id) : []);
	const treeItemCount = $derived(fileTree.reduce((acc: number, f) => acc + (f.children?.length ?? (f.is_file ? 1 : 0)), fileTree.length));
</script>

<section class="w-80 flex-shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden bg-zinc-925/50">
	<!-- Project Header -->
	<header class="h-14 flex items-center gap-3 px-4 border-b border-zinc-800">
		{#if selectedProject}
			<span class="text-xl">{selectedProject.icon}</span>
			<h1 class="font-semibold">{selectedProject.name}</h1>
		{:else}
			<h1 class="font-semibold text-zinc-500">No project selected</h1>
		{/if}
	</header>

	<div class="flex-1 overflow-y-auto">
		<!-- Playbook Section (File Tree) -->
		<div class="border-b border-zinc-800">
			<button
				onclick={() => configExpanded = !configExpanded}
				class="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50"
			>
				<svg
					class="w-4 h-4 transition-transform"
					class:rotate-90={configExpanded}
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				Playbook
				<span class="ml-auto text-xs text-zinc-500">{treeItemCount}</span>
			</button>
			{#if configExpanded}
				<div class="px-2 pb-2" transition:slide={{ duration: 150 }}>
					{#if fileTree.length > 0}
						<PlaybookTree entries={fileTree} />
					{:else if projectStore.loading}
						<div class="px-3 py-2 text-xs text-zinc-500">Loading...</div>
					{:else}
						<div class="px-3 py-2 text-xs text-zinc-500">No files found</div>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Changes Section (from main branch UI) -->
		<div class="border-b border-zinc-800">
			<button
				onclick={() => changesExpanded = !changesExpanded}
				class="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50"
			>
				<svg
					class="w-4 h-4 transition-transform"
					class:rotate-90={changesExpanded}
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				Changes
				<span class="ml-auto text-xs text-zinc-500">{changedFiles.length} files</span>
			</button>
			{#if changesExpanded}
				<div class="px-4 pb-2 space-y-1" transition:slide={{ duration: 150 }}>
					{#each changedFiles as file}
						<div class="flex items-center gap-2 text-xs px-1 py-0.5 rounded hover:bg-zinc-800/50">
							<span class="text-zinc-400 truncate flex-1 font-mono">{file.name}</span>
							<span class="text-emerald-400 flex-shrink-0">+{file.additions}</span>
							<span class="text-red-400 flex-shrink-0">-{file.deletions}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Skills Section -->
		<div>
			<button
				onclick={() => skillsExpanded = !skillsExpanded}
				class="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-800/50"
			>
				<svg
					class="w-4 h-4 transition-transform"
					class:rotate-90={skillsExpanded}
					fill="none" stroke="currentColor" viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
				Skills
				<span class="ml-auto text-xs text-zinc-500">{repoSkills.length + globalSkills.length}</span>
			</button>
			{#if skillsExpanded}
				<div class="px-2 pb-2" transition:slide={{ duration: 150 }}>
					<!-- Repo skills -->
					{#each repoSkills as skill}
						<button
							class="w-full flex items-center gap-2.5 px-3 py-1 rounded-lg hover:bg-zinc-800 text-left"
							onclick={() => onSelectSkill?.(skill.name)}
							onmouseenter={() => {
								if (hoverTimeout) clearTimeout(hoverTimeout);
								hoverTimeout = setTimeout(() => { hoveredSkill = skill.name; }, 100);
							}}
							onmouseleave={() => {
								if (hoverTimeout) clearTimeout(hoverTimeout);
								hoverTimeout = setTimeout(() => { hoveredSkill = null; }, 50);
							}}
						>
							<span class="text-base flex-shrink-0">{skill.icon}</span>
							<div class="flex-1 min-w-0">
								<span class="text-sm font-medium text-zinc-300" class:text-white={hoveredSkill === skill.name}>{skill.name}</span>
								{#if hoveredSkill === skill.name}
									<div class="text-xs text-zinc-400" transition:slide={{ duration: 150 }}>{skill.desc}</div>
								{/if}
							</div>
						</button>
					{/each}
					<!-- Global skills divider -->
					<div class="flex items-center gap-2 px-3 py-1.5 mt-1">
						<div class="flex-1 h-px bg-zinc-800"></div>
						<span class="text-[10px] text-zinc-600 uppercase tracking-wider">global</span>
						<div class="flex-1 h-px bg-zinc-800"></div>
					</div>
					<!-- Global skills -->
					{#each globalSkills as skill}
						<button
							class="w-full flex items-center gap-2.5 px-3 py-1 rounded-lg hover:bg-zinc-800 text-left"
							onclick={() => onSelectSkill?.(skill.name)}
							onmouseenter={() => {
								if (hoverTimeout) clearTimeout(hoverTimeout);
								hoverTimeout = setTimeout(() => { hoveredSkill = skill.name; }, 100);
							}}
							onmouseleave={() => {
								if (hoverTimeout) clearTimeout(hoverTimeout);
								hoverTimeout = setTimeout(() => { hoveredSkill = null; }, 50);
							}}
						>
							<span class="text-base flex-shrink-0">{skill.icon}</span>
							<div class="flex-1 min-w-0">
								<span class="text-sm font-medium text-zinc-300" class:text-white={hoveredSkill === skill.name}>{skill.name}</span>
								{#if hoveredSkill === skill.name}
									<div class="text-xs text-zinc-400" transition:slide={{ duration: 150 }}>{skill.desc}</div>
								{/if}
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>
