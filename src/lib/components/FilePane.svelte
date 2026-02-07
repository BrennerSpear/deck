<script lang="ts">
	import { marked } from 'marked';
	import { fileStore } from '$lib/stores/files.svelte';

	function renderMarkdown(content: string): string {
		return marked(content) as string;
	}

	function getFileName(path: string): string {
		return path.split('/').pop() ?? path;
	}
</script>

<!-- File Pane Header -->
<header class="h-10 flex items-center justify-between px-3 border-b border-zinc-800 bg-zinc-850 flex-shrink-0">
	<!-- File tabs -->
	<div class="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
		{#each fileStore.openFiles as file}
			{@const fileName = getFileName(file)}
			{@const isActive = fileStore.activeFile === file}
			<div
				role="button"
				tabindex="0"
				onclick={() => { fileStore.openFile(file); }}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { fileStore.openFile(file); } }}
				class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap transition-colors cursor-pointer {isActive ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}"
			>
				<span>{fileName}</span>
				<button
					onclick={(e) => { e.stopPropagation(); fileStore.closeFile(file); }}
					class="hover:text-zinc-100 p-0.5 -mr-1"
					type="button"
					aria-label="Close file"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		{/each}
	</div>
	<div class="flex items-center gap-0.5 flex-shrink-0 ml-2">
		<!-- Position buttons -->
		<button
			onclick={() => fileStore.setPosition('left')}
			class="p-1.5 rounded text-xs {fileStore.filePosition === 'left' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}"
			title="Move to left"
			type="button"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h7v16H3zM14 4h7v16h-7z" />
			</svg>
		</button>
		<button
			onclick={() => fileStore.setPosition('above')}
			class="p-1.5 rounded text-xs {fileStore.filePosition === 'above' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}"
			title="Move to top"
			type="button"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 3h16v7H4zM4 14h16v7H4z" />
			</svg>
		</button>
		<button
			onclick={() => fileStore.setPosition('right')}
			class="p-1.5 rounded text-xs {fileStore.filePosition === 'right' ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'}"
			title="Move to right"
			type="button"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4h7v16H4zM15 4h7v16h-7z" />
			</svg>
		</button>
		<span class="w-px h-4 bg-zinc-700 mx-1"></span>
		<!-- Close all -->
		<button
			onclick={() => fileStore.closeAllFiles()}
			class="p-1.5 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
			title="Close all files"
			type="button"
			aria-label="Close all files"
		>
			<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>
</header>

<!-- File Content -->
{#if fileStore.activeFile}
	{@const content = fileStore.getContent(fileStore.activeFile)}
	<div class="flex-1 overflow-auto min-h-0 min-w-0">
		<!-- File path header -->
		<div class="sticky top-0 bg-zinc-900/95 backdrop-blur px-4 py-2 border-b border-zinc-800/50 text-xs text-zinc-500 font-mono">
			{fileStore.activeFile}
		</div>
		{#if content}
			<!-- Rendered markdown -->
			<article class="prose prose-invert prose-sm max-w-none px-4 py-4 prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-li:text-zinc-300 prose-code:text-violet-300 prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800 prose-a:text-violet-400 prose-strong:text-zinc-200">
				{@html renderMarkdown(content)}
			</article>
		{:else if fileStore.loadingFile === fileStore.activeFile}
			<div class="px-4 py-8 text-center text-zinc-500 text-sm">Loading...</div>
		{:else}
			<div class="px-4 py-8 text-center text-zinc-500 text-sm">No content</div>
		{/if}
	</div>
{/if}
