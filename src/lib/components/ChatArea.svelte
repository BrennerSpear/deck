<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	import { projectStore } from '$lib/stores/projects.svelte';
	import type { Conversation, Model, Skill } from '$lib/types';

	// ── State ──────────────────────────────────────────────────────────────

	let chatInput = $state('');
	let selectedModel = $state('claude-opus-4-5');
	let modelSelectorOpen = $state(false);
	let activeConversation = $state<string | null>(null);
	let selectedSkillChain = $state<string[]>([]);
	let isAnimating = $state(false);
	let animatingFromId = $state<string | null>(null);
	let inputRef = $state<HTMLTextAreaElement | null>(null);

	const models: Model[] = [
		{ id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'Anthropic', contextWindow: 200000 },
		{ id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', contextWindow: 200000 },
		{ id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextWindow: 128000 },
		{ id: 'gemini-2-pro', name: 'Gemini 2 Pro', provider: 'Google', contextWindow: 1000000 },
	];

	const skills: Skill[] = [
		{ name: 'develop', desc: 'Implement a feature with tests', icon: '🛠️', calls: [] },
		{ name: 'review', desc: 'Code review, test, approve', icon: '👀', calls: [] },
		{ name: 'deploy-staging', desc: 'Ship to staging environment', icon: '🎭', calls: [] },
		{ name: 'deploy-prod', desc: 'Ship to production', icon: '🌐', calls: [] },
		{ name: 'refactor', desc: 'Clean up without changing behavior', icon: '✨', calls: [] },
		{ name: 'debug', desc: 'Find and fix an issue', icon: '🐛', calls: [] },
		{ name: 'feature-flow', desc: 'idea → develop → test → stage → prod', icon: '🔄', calls: ['develop', 'review', 'deploy-staging', 'deploy-prod'] },
		{ name: 'hotfix', desc: 'Fast-track critical fix to prod', icon: '🚨', calls: ['develop', 'deploy-prod'] },
		{ name: 'research', desc: 'Deep investigation on a topic', icon: '🔍', calls: [] },
		{ name: 'summarize', desc: 'Condense content into key points', icon: '📝', calls: [] },
		{ name: 'explain', desc: 'Break down complex concepts', icon: '💡', calls: [] },
	];

	// ── Derived ────────────────────────────────────────────────────────────

	const projectConversations = $derived(
		projectStore.selectedProjectId
			? projectStore.getProjectConversations(projectStore.selectedProjectId)
			: []
	);

	const workingConvs = $derived(projectConversations.filter((c: Conversation) => c.status === 'working'));
	const waitingConvs = $derived(projectConversations.filter((c: Conversation) => c.status === 'waiting'));
	const doneConvs = $derived(projectConversations.filter((c: Conversation) => c.status === 'done'));

	const activeConv = $derived(activeConversation ? projectConversations.find((c: Conversation) => c.id === activeConversation) : null);
	const currentMessages = $derived(activeConv?.messages ?? []);
	const inputPlaceholder = $derived(activeConversation ? 'Reply...' : 'Start a new task...');
	const inactiveWaitingOrDone = $derived([...waitingConvs, ...doneConvs].filter((c: Conversation) => c.id !== activeConversation));

	const systemPromptTokens = 2800;

	// ── Helpers ────────────────────────────────────────────────────────────

	function formatTokens(count: number): string {
		if (count >= 1000000) return (count / 1000000) + 'M';
		if (count >= 1000) return (count / 1000) + 'k';
		return count.toString();
	}

	function getSkill(name: string) {
		return skills.find(s => s.name === name);
	}

	function selectSkill(skillName: string) {
		const skill = skills.find(s => s.name === skillName);
		if (!skill) return;
		selectedSkillChain = [skillName, ...(skill.calls || [])];
		activeConversation = null;
	}

	function clearSkillChain() {
		selectedSkillChain = [];
	}

	function switchToConversation(convId: string) {
		if (convId === activeConversation || isAnimating) return;
		animatingFromId = activeConversation;
		isAnimating = true;
		activeConversation = convId;
		setTimeout(() => {
			isAnimating = false;
			animatingFromId = null;
		}, 300);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			chatInput = '';
			selectedSkillChain = [];
		}
		// Backspace on empty input clears skill chain
		if (e.key === 'Backspace' && chatInput === '' && selectedSkillChain.length > 0) {
			e.preventDefault();
			selectedSkillChain = [];
		}
	}

	// Expose selectSkill for parent
	export { selectSkill };
</script>

<section class="flex-1 flex flex-col overflow-hidden min-w-0">
	<!-- Chat Header -->
	<header class="h-14 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-925/30">
		<div class="flex items-center gap-3">
			<img src="/axel.jpg" alt="Axel" class="w-8 h-8 rounded-full object-cover" />
			<div>
				<div class="text-sm font-medium">Axel</div>
				<div class="text-xs text-zinc-500">AI Assistant</div>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if workingConvs.length > 0}
				<span class="text-xs text-zinc-500">{workingConvs.length} working</span>
			{/if}
			<button class="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100" title="Menu">
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</div>
	</header>

	<div class="flex-1 flex flex-col overflow-hidden">
		<!-- Working conversations (blue, collapsed at top) -->
		{#if workingConvs.filter((c: Conversation) => c.id !== activeConversation).length > 0}
			<div class="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 space-y-1 overflow-hidden">
				{#each workingConvs.filter((c: Conversation) => c.id !== activeConversation) as conv (conv.id)}
					<button
						onclick={() => switchToConversation(conv.id)}
						class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left transition-all duration-200"
						in:fly={{ y: 50, duration: 250, delay: 50, easing: cubicOut }}
						out:fly={{ y: -30, duration: 150, easing: cubicOut }}
					>
						<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
						<div class="flex-1 min-w-0">
							<div class="text-sm font-medium text-zinc-300">{conv.title}</div>
							<div class="text-xs text-zinc-500 truncate">{conv.preview}</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}

		<!-- Active conversation (main area) -->
		{#key activeConversation}
			{#if activeConversation && activeConv}
				<div
					class="flex-1 overflow-y-auto px-6 py-4 space-y-4"
					in:fly={{ y: 40, duration: 250, delay: 100, easing: quintOut }}
				>
					<!-- Conversation title -->
					<div class="flex items-center gap-2 mb-2">
						{#if activeConv.status === 'working'}
							<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
						{:else if activeConv.status === 'waiting'}
							<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
						{:else}
							<span class="w-2 h-2 rounded-full bg-zinc-500"></span>
						{/if}
						<h3 class="text-sm font-medium text-zinc-300">{activeConv.title}</h3>
					</div>

					<!-- Messages -->
					{#each currentMessages as message}
						<div class="flex gap-3" class:justify-end={message.role === 'user'}>
							{#if message.role === 'assistant'}
								<img src="/axel.jpg" alt="Axel" class="w-7 h-7 rounded-full object-cover flex-shrink-0" />
							{/if}
							<div
								class="max-w-[80%] rounded-2xl px-4 py-2.5"
								class:bg-zinc-800={message.role === 'assistant'}
								class:bg-violet-900={message.role === 'user'}
							>
								<p class="text-sm leading-relaxed">{message.content}</p>

								{#if message.toolCalls}
									<div class="mt-2 space-y-1 pt-2 border-t border-zinc-700">
										{#each message.toolCalls as tool}
											<div class="flex items-center gap-2 text-xs">
												{#if tool.status === 'done'}
													<span class="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
														<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
														</svg>
													</span>
												{:else}
													<span class="w-4 h-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center">
														<svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
														</svg>
													</span>
												{/if}
												<span class="text-zinc-400 font-mono">{tool.type}</span>
												<span class="text-zinc-300 font-mono truncate">{tool.file || tool.command}</span>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}

					<!-- If waiting, show the question as the last message -->
					{#if activeConv.status === 'waiting' && activeConv.waitingFor}
						<div class="flex gap-3">
							<img src="/axel.jpg" alt="Axel" class="w-7 h-7 rounded-full object-cover flex-shrink-0" />
							<div class="max-w-[80%] rounded-2xl px-4 py-2.5 bg-zinc-800">
								<p class="text-sm leading-relaxed">{activeConv.waitingFor}</p>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Empty state when no conversation selected -->
				<div
					class="flex-1 flex items-center justify-center text-zinc-600"
					in:fly={{ y: 20, duration: 200, easing: cubicOut }}
				>
					<div class="text-center">
						<div class="text-4xl mb-3">🦎</div>
						<div class="text-sm">What are we building?</div>
					</div>
				</div>
			{/if}
		{/key}
	</div>

	<!-- Input Area -->
	<div class="p-4 border-t border-zinc-800 bg-zinc-900">
		<!-- Skill chain overflow (when > 2 skills) -->
		{#if selectedSkillChain.length > 2}
			<div class="flex items-center gap-1.5 mb-3 flex-wrap">
				{#each selectedSkillChain as skillName, i}
					{@const skill = getSkill(skillName)}
					{#if skill}
						<div
							class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
							class:bg-violet-400={i === 0}
							class:text-zinc-950={i === 0}
							class:bg-zinc-800={i > 0}
							class:text-zinc-300={i > 0}
						>
							<span>{skill.icon}</span>
							<span class="font-medium">{skill.name}</span>
							{#if i === 0}
								<button onclick={clearSkillChain} class="ml-0.5 hover:text-zinc-300">
									<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							{/if}
						</div>
						{#if i < selectedSkillChain.length - 1}
							<svg class="w-3 h-3 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						{/if}
					{/if}
				{/each}
			</div>
		{/if}

		<div class="flex items-center gap-2">
			{#if activeConversation}
				<button
					onclick={() => {
						activeConversation = null;
						setTimeout(() => inputRef?.focus(), 50);
					}}
					class="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center gap-1.5"
					title="New task"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
					</svg>
					New
				</button>
			{/if}
			<div class="flex-1 relative flex items-center bg-zinc-950 border border-zinc-700 rounded-lg font-mono focus-within:ring-1 focus-within:ring-violet-400 focus-within:border-violet-400">
				<!-- Terminal prompt -->
				<span class="pl-3 text-violet-400 text-sm select-none">❯</span>
				<!-- Inline skill bubbles (when <= 2 skills) -->
				{#if selectedSkillChain.length > 0 && selectedSkillChain.length <= 2}
					<div class="flex items-center gap-1 pl-2 flex-shrink-0">
						{#each selectedSkillChain as skillName, i}
							{@const skill = getSkill(skillName)}
							{#if skill}
								<div
									class="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
									class:bg-violet-400={i === 0}
									class:text-zinc-950={i === 0}
									class:bg-zinc-800={i > 0}
									class:text-zinc-300={i > 0}
								>
									<span>{skill.icon}</span>
									<span class="font-medium">{skill.name}</span>
									{#if i === 0}
										<button onclick={clearSkillChain} class="ml-0.5 hover:text-zinc-300">
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									{/if}
								</div>
								{#if i < selectedSkillChain.length - 1}
									<svg class="w-3 h-3 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								{/if}
							{/if}
						{/each}
					</div>
				{/if}
				<textarea
					bind:this={inputRef}
					bind:value={chatInput}
					onkeydown={handleKeydown}
					placeholder={selectedSkillChain.length > 0 ? 'add context...' : inputPlaceholder}
					rows="1"
					class="flex-1 bg-transparent px-2 py-2.5 text-sm resize-none focus:outline-none placeholder:text-zinc-600 font-mono"
				></textarea>
			</div>
			<button class="px-4 py-2.5 rounded-lg bg-violet-400 hover:bg-violet-300 text-zinc-950 text-sm font-medium transition-colors flex items-center gap-2" title="Send">
				Send
				<kbd class="text-zinc-700 text-xs">↵</kbd>
			</button>
		</div>
		<!-- Status bar -->
		<div class="flex items-center justify-between mt-2 px-1 text-[11px] font-mono text-zinc-500">
			<div class="flex items-center gap-3">
				{#if activeConv?.status === 'working'}
					<span class="text-blue-400 status-shimmer">waiting</span>
				{:else}
					<span class="text-emerald-400">ready</span>
				{/if}
				<span class="text-zinc-600">│</span>
				<!-- Model selector in status bar (only interactive for new conversations) -->
				{#if !activeConversation}
					<div class="relative">
						<button
							onclick={() => modelSelectorOpen = !modelSelectorOpen}
							class="flex items-center gap-1 hover:text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded"
						>
							<span>{models.find(m => m.id === selectedModel)?.name}</span>
							<svg class="w-3 h-3 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						{#if modelSelectorOpen}
							<div class="absolute bottom-full left-0 mb-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 z-50 min-w-[180px]">
								{#each models as model}
									<button
										onclick={() => { selectedModel = model.id; modelSelectorOpen = false; }}
										class="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 flex items-center justify-between"
										class:text-violet-400={selectedModel === model.id}
										class:text-zinc-300={selectedModel !== model.id}
									>
										<span>{model.name}</span>
										<span class="text-zinc-500">{formatTokens(model.contextWindow)}</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{:else}
					<span>{models.find(m => m.id === selectedModel)?.name}</span>
				{/if}
				<span class="text-zinc-600">│</span>
				<span>{formatTokens(systemPromptTokens)} / {formatTokens(models.find(m => m.id === selectedModel)?.contextWindow ?? 200000)} tokens</span>
			</div>
			<div class="flex items-center gap-3">
				<span>session: 8m 24s</span>
			</div>
		</div>
	</div>

	<!-- Waiting/Done conversations (green, collapsed below input) -->
	{#if inactiveWaitingOrDone.length > 0}
		<div class="border-t border-zinc-800 bg-zinc-900/50 px-4 py-2 space-y-1 overflow-hidden">
			{#each inactiveWaitingOrDone as conv (conv.id)}
				<button
					onclick={() => switchToConversation(conv.id)}
					class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left transition-all duration-200"
					in:fly={{ y: 50, duration: 250, delay: 50, easing: cubicOut }}
					out:fly={{ y: 30, duration: 150, easing: cubicOut }}
				>
					<span class="w-2 h-2 rounded-full bg-emerald-500" class:animate-pulse={conv.status === 'waiting'}></span>
					<div class="flex-1 min-w-0">
						<div class="text-sm font-medium text-zinc-300">{conv.title}</div>
						<div class="text-xs text-zinc-500 truncate">
							{#if conv.status === 'waiting' && conv.waitingFor}
								{conv.waitingFor}
							{:else}
								{conv.preview}
							{/if}
						</div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</section>
