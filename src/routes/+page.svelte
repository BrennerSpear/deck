<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { projectStore } from '$lib/stores/projects.svelte';
	import { fileStore } from '$lib/stores/files.svelte';
	import ProjectSidebar from '$lib/components/ProjectSidebar.svelte';
	import ProjectPanel from '$lib/components/ProjectPanel.svelte';
	import ChatArea from '$lib/components/ChatArea.svelte';
	import FilePane from '$lib/components/FilePane.svelte';

	// Layout state
	let sidebarCollapsed = $state(false);
	let configExpanded = $state(true);
	let skillsExpanded = $state(true);
	let changesExpanded = $state(true);

	// Resize state
	let isResizingPane = $state(false);
	let dragStartX = $state(0);
	let dragStartY = $state(0);
	let dragStartWidth = $state(0);
	let dragStartHeight = $state(0);

	// Ref to ChatArea for skill selection
	let chatArea: ChatArea;

	// Initialize project store on mount
	onMount(() => {
		projectStore.init();
	});

	// Resize handlers
	function startResize(e: MouseEvent) {
		isResizingPane = true;
		dragStartX = e.clientX;
		dragStartY = e.clientY;
		dragStartWidth = fileStore.filePaneWidth;
		dragStartHeight = fileStore.filePaneHeight;

		const onMouseMove = (e: MouseEvent) => {
			if (!isResizingPane) return;
			if (fileStore.filePosition === 'left') {
				fileStore.setWidth(Math.max(300, Math.min(800, dragStartWidth + (e.clientX - dragStartX))));
			} else if (fileStore.filePosition === 'right') {
				fileStore.setWidth(Math.max(300, Math.min(800, dragStartWidth - (e.clientX - dragStartX))));
			} else if (fileStore.filePosition === 'above') {
				fileStore.setHeight(Math.max(200, Math.min(600, dragStartHeight + (e.clientY - dragStartY))));
			}
		};

		const onMouseUp = () => {
			isResizingPane = false;
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		};

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	function handleSelectSkill(name: string) {
		chatArea?.selectSkill(name);
	}
</script>

<div class="h-screen flex bg-zinc-950 text-zinc-100 overflow-hidden">
	<!-- Left Sidebar - Projects -->
	<ProjectSidebar bind:sidebarCollapsed />

	<!-- Main Content Area -->
	<main class="flex-1 flex overflow-hidden">
		<!-- Project Panel (Playbook + Changes + Skills) -->
		<ProjectPanel
			bind:configExpanded
			bind:skillsExpanded
			bind:changesExpanded
			onSelectSkill={handleSelectSkill}
		/>

		<!-- Workspace Area (Chat + Files) -->
		<div
			class="flex-1 flex overflow-hidden"
			class:flex-col={fileStore.filePosition === 'above' && fileStore.showFilePane}
			class:flex-row={fileStore.filePosition !== 'above' || !fileStore.showFilePane}
		>
			<!-- File Pane (when positioned left) -->
			{#if fileStore.showFilePane && fileStore.filePosition === 'left'}
				<aside
					class="flex-shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden"
					style="width: {fileStore.filePaneWidth}px"
				>
					<FilePane />
				</aside>
				<div
					class="w-1 hover:bg-violet-500/50 cursor-col-resize flex-shrink-0 transition-colors"
					onmousedown={startResize}
					role="separator"
					aria-orientation="vertical"
				></div>
			{/if}

			<!-- File Pane (when positioned above) -->
			{#if fileStore.showFilePane && fileStore.filePosition === 'above'}
				<aside
					class="flex-shrink-0 border-b border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden"
					style="height: {fileStore.filePaneHeight}px"
				>
					<FilePane />
				</aside>
				<div
					class="h-1 hover:bg-violet-500/50 cursor-row-resize flex-shrink-0 transition-colors"
					onmousedown={startResize}
					role="separator"
					aria-orientation="horizontal"
				></div>
			{/if}

			<!-- Chat Area -->
			<ChatArea bind:this={chatArea} />

			<!-- File Pane (when positioned right) -->
			{#if fileStore.showFilePane && fileStore.filePosition === 'right'}
				<div
					class="w-1 hover:bg-violet-500/50 cursor-col-resize flex-shrink-0 transition-colors"
					onmousedown={startResize}
					role="separator"
					aria-orientation="vertical"
				></div>
				<aside
					class="flex-shrink-0 border-l border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden"
					style="width: {fileStore.filePaneWidth}px"
				>
					<FilePane />
				</aside>
			{/if}
		</div>
	</main>
</div>
