<script lang="ts">
	import { slide } from 'svelte/transition';
	import type { DirEntry } from '$lib/types';
	import { fileStore } from '$lib/stores/files.svelte';
	import PlaybookTree from './PlaybookTree.svelte';

	let { entries, basePath = '' }: { entries: DirEntry[]; basePath?: string } = $props();

	let expandedFolders = $state(new Set<string>());
	let hoveredItem = $state<string | null>(null);
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;

	function toggleFolder(path: string) {
		if (expandedFolders.has(path)) {
			expandedFolders = new Set([...expandedFolders].filter(f => f !== path));
		} else {
			expandedFolders = new Set([...expandedFolders, path]);
		}
	}

	function handleHover(path: string) {
		if (hoverTimeout) clearTimeout(hoverTimeout);
		hoverTimeout = setTimeout(() => { hoveredItem = path; }, 100);
	}

	function handleLeave() {
		if (hoverTimeout) clearTimeout(hoverTimeout);
		hoverTimeout = setTimeout(() => { hoveredItem = null; }, 50);
	}

	function formatSize(bytes?: number): string {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes}B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
		return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
	}
</script>

<div class="space-y-0.5">
	{#each entries as entry}
		{@const isExpanded = expandedFolders.has(entry.path)}
		<div>
			<button
				onclick={() => {
					if (entry.is_dir) {
						toggleFolder(entry.path);
					} else {
						fileStore.openFile(entry.path);
					}
				}}
				onmouseenter={() => handleHover(entry.path)}
				onmouseleave={handleLeave}
				class="w-full flex items-center gap-2 px-3 py-1 rounded text-sm hover:bg-zinc-800 text-left group text-zinc-400 hover:text-zinc-200"
			>
				{#if entry.is_dir}
					<svg
						class="w-3 h-3 transition-transform flex-shrink-0 text-zinc-500"
						class:rotate-90={isExpanded}
						fill="none" stroke="currentColor" viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
					<svg class="w-4 h-4 flex-shrink-0 text-amber-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
					</svg>
				{:else}
					<span class="w-3 h-3 flex-shrink-0"></span>
					<svg class="w-4 h-4 flex-shrink-0 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				{/if}
				<span class="flex-1 truncate text-xs font-medium">{entry.name}</span>
				{#if entry.is_dir && entry.children}
					<span class="text-xs text-zinc-600">{entry.children.length}</span>
				{:else if entry.size}
					<span class="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">{formatSize(entry.size)}</span>
				{/if}
			</button>

			{#if entry.is_dir && entry.children && isExpanded}
				<div class="ml-4 border-l border-zinc-800 pl-2 mt-0.5 mb-0.5" transition:slide={{ duration: 150 }}>
					<PlaybookTree entries={entry.children} basePath={entry.path} />
				</div>
			{/if}
		</div>
	{/each}
</div>
