<script lang="ts">
	import '../app.css';
	import { slide, fly } from 'svelte/transition';
	import { quintOut, cubicOut } from 'svelte/easing';
	
	// State
	let selectedProject = $state('knowhere');
	let sidebarCollapsed = $state(false);
	let configExpanded = $state(true);
	let filesExpanded = $state(true);
	let skillsExpanded = $state(true);
	let chatInput = $state('');
	let expandedFolders = $state(new Set<string>(['skills']));
	let hoveredSkill = $state<string | null>(null);
	let hoveredPlaybookItem = $state<string | null>(null);
	let hoverTimeout: ReturnType<typeof setTimeout> | null = null;
	let selectedModel = $state('claude-opus-4-5');
	let modelSelectorOpen = $state(false);
	
	const models = [
		{ id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'Anthropic', contextWindow: 200000 },
		{ id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', contextWindow: 200000 },
		{ id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextWindow: 128000 },
		{ id: 'gemini-2-pro', name: 'Gemini 2 Pro', provider: 'Google', contextWindow: 1000000 },
	];
	
	// Format token count (e.g., 200000 -> "200k", 1000000 -> "1M")
	function formatTokens(count: number): string {
		if (count >= 1000000) {
			return (count / 1000000) + 'M';
		} else if (count >= 1000) {
			return (count / 1000) + 'k';
		}
		return count.toString();
	}
	
	// Mock system prompt token count
	const systemPromptTokens = 2800;
	
	// Mock data
	const projects = [
		{ id: 'knowhere', name: 'Knowhere', icon: '🏜️', status: 'active' },
		{ id: 'agentboard', name: 'AgentBoard', icon: '📋', status: 'active' },
		{ id: 'clarity', name: 'Clarity', icon: '💎', status: 'active' },
		{ id: 'openclaw', name: 'OpenClaw', icon: '🦎', status: 'paused' },
		{ id: 'research', name: 'Research', icon: '🔬', status: 'active' },
	];
	
	// change: 'added' (green) | 'changed' (blue) | 'deleted' (red) | undefined (no change)
	const configFiles = [
		{ name: 'AGENTS.md', change: 'changed' },
		{ name: 'skills', isFolder: true, children: [
			{ name: 'develop', desc: 'Implement a feature with tests', fileCount: 3, children: [
				{ name: 'setup', desc: 'Environment and tooling setup' },
				{ name: 'scripts', isFolder: true, children: [
					{ name: 'scaffold-component', desc: 'Generate component boilerplate' },
					{ name: 'run-tests', desc: 'Run test suite with coverage' },
				]},
			]},
			{ name: 'review', desc: 'Code review, test, approve' },
			{ name: 'deploy-staging', desc: 'Ship to staging environment', change: 'changed' },
			{ name: 'deploy-prod', desc: 'Ship to production', fileCount: 2, children: [
				{ name: 'setup', desc: 'Production env configuration' },
				{ name: 'scripts', isFolder: true, children: [
					{ name: 'deploy', desc: 'Run deployment pipeline' },
				]},
			]},
			{ name: 'research', desc: 'Deep investigation on a topic', fileCount: 5, children: [
				{ name: 'setup', desc: 'Research tools and sources' },
				{ name: 'references', isFolder: true, children: [
					{ name: 'search-strategies', desc: 'How to search effectively' },
					{ name: 'source-evaluation', desc: 'Assessing credibility' },
				]},
				{ name: 'scripts', isFolder: true, children: [
					{ name: 'export-pdf', desc: 'Export research to PDF' },
					{ name: 'parallel-research', desc: 'Multi-threaded deep dive', change: 'added' },
				]},
			]},
			{ name: 'refactor', desc: 'Clean up without changing behavior' },
			{ name: 'debug', desc: 'Find and fix an issue' },
			{ name: 'feature-flow', desc: 'idea → develop → test → stage → prod', change: 'added', fileCount: 4, children: [
				{ name: 'setup', desc: 'Workflow prerequisites', change: 'added' },
				{ name: 'references', isFolder: true, change: 'added', children: [
					{ name: 'branching-strategy', desc: 'Git flow for features', change: 'added' },
					{ name: 'ci-pipeline', desc: 'How CI runs on PRs', change: 'added' },
				]},
			]},
			{ name: 'hotfix', desc: 'Fast-track critical fix to prod' },
		]},
		{ name: 'tools', isFolder: true, children: [
			{ name: 'git', desc: 'Commit conventions, branch strategy' },
			{ name: 'testing', desc: 'Vitest unit + Playwright e2e', fileCount: 2, change: 'changed' },
			{ name: 'database', desc: 'Supabase schema, migrations, RLS', fileCount: 3 },
			{ name: 'hosting', desc: 'Vercel deployment config' },
			{ name: 'monitoring', desc: 'Sentry errors, Posthog analytics' },
		]},
		{ name: 'scripts', isFolder: true, children: [
			{ name: 'seed-db', desc: 'Populate dev database with test data' },
			{ name: 'reset-db', desc: 'Wipe and rebuild from migrations' },
			{ name: 'sync-prod', desc: 'Pull sanitized prod data to local', change: 'deleted' },
			{ name: 'gen-types', desc: 'Generate TS types from schema' },
		]},
		{ name: 'hooks', isFolder: true, children: [
			{ name: 'pre-commit', desc: 'Lint + typecheck before commit' },
			{ name: 'post-push', desc: 'Trigger CI, notify Slack' },
			{ name: 'on-deploy', desc: 'Run migrations, warm caches' },
			{ name: 'on-error', desc: 'Alert on Sentry spike' },
		]},
		{ name: 'schedules', isFolder: true, children: [
			{ name: 'morning-summary', desc: 'Daily: what happened overnight' },
			{ name: 'weekly-review', desc: 'Friday: metrics, wins, blockers' },
			{ name: 'dependency-check', desc: 'Weekly: outdated packages' },
			{ name: 'backup-verify', desc: 'Daily: confirm backups exist' },
		]},
		{ name: 'context', isFolder: true, children: [
			{ name: 'architecture', desc: 'Stack, structure, key patterns' },
			{ name: 'conventions', desc: 'Naming, file org, code style' },
			{ name: 'decisions', desc: 'ADRs: why we chose X over Y' },
			{ name: 'glossary', desc: 'Domain terms and definitions' },
		]},
		{ name: 'caches', isFolder: true, children: [
			{ name: 'tldr', isFolder: true, desc: 'Summarized snapshots of long docs' },
			{ name: 'recent-decisions', desc: 'Last 10 choices for quick ref' },
			{ name: 'conversation-summaries', isFolder: true, desc: 'Compressed session history' },
		]},
	];
	
	const changedFiles = [
		{ name: 'src/lib/chat.ts', additions: 45, deletions: 12 },
		{ name: 'src/routes/+page.svelte', additions: 120, deletions: 0 },
		{ name: 'package.json', additions: 3, deletions: 1 },
	];
	
	// Skills matching the skills folder - scope: 'repo' or 'global'
	// `calls` lists other skills this skill chains to (in order)
	const repoSkills = [
		{ name: 'develop', desc: 'Implement a feature with tests', icon: '🛠️', calls: [] },
		{ name: 'review', desc: 'Code review, test, approve', icon: '👀', calls: [] },
		{ name: 'deploy-staging', desc: 'Ship to staging environment', icon: '🎭', calls: [] },
		{ name: 'deploy-prod', desc: 'Ship to production', icon: '🌐', calls: [] },
		{ name: 'refactor', desc: 'Clean up without changing behavior', icon: '✨', calls: [] },
		{ name: 'debug', desc: 'Find and fix an issue', icon: '🐛', calls: [] },
		{ name: 'feature-flow', desc: 'idea → develop → test → stage → prod', icon: '🔄', calls: ['develop', 'review', 'deploy-staging', 'deploy-prod'] },
		{ name: 'hotfix', desc: 'Fast-track critical fix to prod', icon: '🚨', calls: ['develop', 'deploy-prod'] },
	];
	
	const globalSkills = [
		{ name: 'research', desc: 'Deep investigation on a topic', icon: '🔍', calls: [] },
		{ name: 'summarize', desc: 'Condense content into key points', icon: '📝', calls: [] },
		{ name: 'explain', desc: 'Break down complex concepts', icon: '💡', calls: [] },
	];
	
	const skills = [...repoSkills, ...globalSkills];
	
	// Selected skill chain for input
	let selectedSkillChain = $state<string[]>([]);
	
	// Conversation threads - can be working, waiting, or done
	// Each conversation belongs to a project
	const conversations = [
		// Knowhere: 2 blue (working), 2 green (1 waiting, 1 done)
		{
			id: 'conv-1',
			projectId: 'knowhere',
			title: 'Dark mode toggle',
			status: 'done',
			preview: 'Toggle in header with animated icons, localStorage + system preference',
			waitingFor: null,
			messages: [
				{ role: 'user', content: 'I need to add a dark mode toggle to my SvelteKit app. It should go in the header and persist the user\'s preference to localStorage.' },
				{ role: 'assistant', content: 'I\'ll create a dark mode toggle for your header. Let me check your existing header component.',
					toolCalls: [
						{ type: 'bash', command: 'ls src/lib/components/', status: 'done' },
						{ type: 'bash', command: 'cat src/routes/+layout.svelte', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'Got it. I\'ll create a ThemeToggle component with a store for state and localStorage persistence.',
					toolCalls: [
						{ type: 'write', file: 'src/lib/stores/theme.ts', status: 'done' },
						{ type: 'write', file: 'src/lib/components/ThemeToggle.svelte', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'Now adding it to your Header and initializing on app load.',
					toolCalls: [
						{ type: 'edit', file: 'src/lib/components/Header.svelte', status: 'done' },
						{ type: 'edit', file: 'src/routes/+layout.svelte', status: 'done' },
					]
				},
				{ role: 'user', content: 'Does it handle the system preference too? Like if someone has their OS set to dark mode?' },
				{ role: 'assistant', content: 'Good catch — I\'ll update the theme store to check prefers-color-scheme on first load.',
					toolCalls: [
						{ type: 'edit', file: 'src/lib/stores/theme.ts', status: 'done' },
					]
				},
				{ role: 'user', content: 'Can you add a little sun/moon icon that animates when toggling?' },
				{ role: 'assistant', content: 'Sure! Adding sun and moon SVGs with a rotate+fade transition.',
					toolCalls: [
						{ type: 'edit', file: 'src/lib/components/ThemeToggle.svelte', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'Done! The toggle shows a sun icon in dark mode and moon in light mode, with a 200ms animated transition. Dev server running at localhost:5173.' }
			]
		},
		{
			id: 'conv-2',
			projectId: 'knowhere',
			title: 'Magic link auth',
			status: 'working',
			preview: 'Setting up Supabase auth with magic links...',
			waitingFor: null,
			messages: [
				{ role: 'user', content: 'I need to add magic link authentication to my SvelteKit app using Supabase. Can you set that up?' },
				{ role: 'assistant', content: 'I\'ll set up Supabase magic link authentication. Installing the required dependencies first.',
					toolCalls: [
						{ type: 'bash', command: 'npm install @supabase/supabase-js @supabase/ssr', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'Creating the Supabase client configuration for server and browser environments.',
					toolCalls: [
						{ type: 'write', file: 'src/lib/supabase/client.ts', status: 'done' },
						{ type: 'write', file: 'src/lib/supabase/server.ts', status: 'done' },
					]
				},
				{ role: 'user', content: 'Great, I\'ll need a login page with an email input. Keep it simple for now.' },
				{ role: 'assistant', content: 'Creating a clean login page with magic link functionality.',
					toolCalls: [
						{ type: 'write', file: 'src/routes/login/+page.svelte', status: 'done' },
						{ type: 'write', file: 'src/routes/login/+page.server.ts', status: 'done' },
					]
				},
				{ role: 'user', content: 'What about handling the callback when users click the magic link in their email?' },
				{ role: 'assistant', content: 'Good call — adding an auth callback route to exchange the token for a session, plus hooks for session management.',
					toolCalls: [
						{ type: 'write', file: 'src/hooks.server.ts', status: 'done' },
						{ type: 'write', file: 'src/routes/auth/callback/+server.ts', status: 'running' },
					]
				},
			]
		},
		{
			id: 'conv-3', 
			projectId: 'knowhere',
			title: 'API rate limiting',
			status: 'working',
			preview: 'Redis sliding window limiter, 100/min auth, 20/min anon...',
			waitingFor: null,
			messages: [
				{ role: 'user', content: 'I need to add rate limiting to my SvelteKit API endpoints. We\'re getting hammered by some clients. Can you set up Redis-based rate limiting?' },
				{ role: 'assistant', content: 'I\'ll set up Redis-based rate limiting. Let me check your project structure first.',
					toolCalls: [
						{ type: 'bash', command: 'cat package.json', status: 'done' },
						{ type: 'bash', command: 'ls -la src/routes/api/', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'I see your API routes. Installing ioredis and creating a sliding window rate limiter.',
					toolCalls: [
						{ type: 'bash', command: 'npm install ioredis', status: 'done' },
						{ type: 'write', file: 'src/lib/server/redis.ts', status: 'done' },
					]
				},
				{ role: 'user', content: 'What limits are you setting? I want 100 requests per minute for authenticated users and 20 for anonymous.' },
				{ role: 'assistant', content: 'Implementing tiered rate limiting with those limits. Authenticated users keyed by user ID, anonymous by IP. Returns 429 with Retry-After header when exceeded.',
					toolCalls: [
						{ type: 'write', file: 'src/lib/server/rate-limiter.ts', status: 'done' },
						{ type: 'write', file: 'src/lib/server/middleware/rateLimit.ts', status: 'done' },
					]
				},
				{ role: 'user', content: 'Can you add it to hooks.server.ts so it applies globally to all API routes?' },
				{ role: 'assistant', content: 'Updating hooks.server.ts to apply rate limiting to all /api/* routes with proper error handling and logging.',
					toolCalls: [
						{ type: 'bash', command: 'cat src/hooks.server.ts', status: 'done' },
						{ type: 'edit', file: 'src/hooks.server.ts', status: 'running' },
						{ type: 'bash', command: 'redis-cli ping', status: 'running' },
					]
				},
			]
		},
		{
			id: 'conv-4',
			projectId: 'knowhere',
			title: 'Database schema',
			status: 'waiting',
			preview: 'Schema drafted, pending soft delete decision',
			waitingFor: 'Should I add soft deletes to all tables, or just users and projects?',
			messages: [
				{ role: 'user', content: 'I need help designing the database schema for a project management app. We\'re using Supabase/Postgres. It needs users, organizations, projects, and tasks.' },
				{ role: 'assistant', content: 'I\'ll design a solid schema for your project management app. Here\'s the structure:\n\n• users - extended profile data (Supabase Auth handles auth)\n• organizations - workspaces containing projects\n• org_members - junction table with roles\n• projects - belong to orgs\n• tasks - belong to projects, assigned to users',
					toolCalls: [
						{ type: 'write', file: 'supabase/migrations/20260205_initial_schema.sql', status: 'done' },
					]
				},
				{ role: 'user', content: 'We should add indexes for the common queries. Also can you add a task comments table?' },
				{ role: 'assistant', content: 'Adding comments table and indexes for foreign keys and common query patterns.',
					toolCalls: [
						{ type: 'edit', file: 'supabase/migrations/20260205_initial_schema.sql', status: 'done' },
						{ type: 'bash', command: 'supabase db lint', status: 'done' },
					]
				},
				{ role: 'user', content: 'We need to be able to restore deleted data sometimes. Should we add soft deletes?' },
				{ role: 'assistant', content: 'Soft deletes are good for data recovery, but add complexity. A few options:\n\n1. All tables — Maximum flexibility, more complex queries\n2. Just users and projects — Covers most recovery scenarios\n3. Just users — Simplest, covers "accidentally deleted my account"\n\nFor tasks and comments, hard deletes are usually fine since they\'re cheap to recreate. But users and projects often have important history.' },
			]
		},
		// AgentBoard: 1 blue (working), 1 green (done)
		{
			id: 'conv-5',
			projectId: 'agentboard',
			title: 'Drag and drop cards',
			status: 'working',
			preview: 'Implementing card reordering with dnd-kit...',
			waitingFor: null,
			messages: [
				{ role: 'user', content: 'Add drag and drop for the kanban cards. Should work between columns too.' },
				{ role: 'assistant', content: 'I\'ll set up drag and drop using dnd-kit. It handles the tricky parts like collision detection and keyboard accessibility.',
					toolCalls: [
						{ type: 'bash', command: 'npm install @dnd-kit/core @dnd-kit/sortable', status: 'done' },
						{ type: 'write', file: 'src/lib/components/Board.svelte', status: 'running' },
					]
				},
			]
		},
		{
			id: 'conv-6',
			projectId: 'agentboard',
			title: 'Card filtering',
			status: 'done',
			preview: 'Filter by assignee, label, and due date',
			waitingFor: null,
			messages: [
				{ role: 'user', content: 'Add filters for the board - by assignee, labels, and due date.' },
				{ role: 'assistant', content: 'I\'ll add a filter bar with those options. Using URL params so filters are shareable.',
					toolCalls: [
						{ type: 'write', file: 'src/lib/components/FilterBar.svelte', status: 'done' },
						{ type: 'edit', file: 'src/routes/board/+page.svelte', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'Done! Filters persist in the URL so you can share filtered views.' }
			]
		},
		// Clarity: 3 green (2 done, 1 waiting)
		{
			id: 'conv-7',
			projectId: 'clarity',
			title: 'PDF export',
			status: 'done',
			preview: 'Export reports to PDF with charts',
			waitingFor: null,
			messages: [
				{ role: 'user', content: 'Need to export the analytics dashboard to PDF.' },
				{ role: 'assistant', content: 'I\'ll use puppeteer to render the dashboard and export to PDF. This preserves the charts.',
					toolCalls: [
						{ type: 'bash', command: 'npm install puppeteer', status: 'done' },
						{ type: 'write', file: 'src/lib/server/pdf-export.ts', status: 'done' },
						{ type: 'write', file: 'src/routes/api/export/+server.ts', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'PDF export is ready. Hit /api/export?dashboard=main to generate.' }
			]
		},
		{
			id: 'conv-8',
			projectId: 'clarity',
			title: 'Webhook notifications',
			status: 'done',
			preview: 'Slack + Discord webhooks for alerts',
			waitingFor: null,
			messages: [
				{ role: 'user', content: 'Set up webhook notifications for Slack and Discord when metrics hit thresholds.' },
				{ role: 'assistant', content: 'Adding a webhook system with configurable thresholds per metric.',
					toolCalls: [
						{ type: 'write', file: 'src/lib/server/webhooks.ts', status: 'done' },
						{ type: 'write', file: 'src/routes/settings/webhooks/+page.svelte', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'Webhooks are live. Configure them in Settings → Webhooks.' }
			]
		},
		{
			id: 'conv-9',
			projectId: 'clarity',
			title: 'Custom date ranges',
			status: 'waiting',
			preview: 'Needs decision on preset options',
			waitingFor: 'Which preset date ranges do you want? I have: Today, Yesterday, Last 7 days, Last 30 days, This month, Last month, This year. Want any others?',
			messages: [
				{ role: 'user', content: 'Add custom date range picker to the dashboard.' },
				{ role: 'assistant', content: 'I\'ll add a date range picker with presets and custom range option.',
					toolCalls: [
						{ type: 'write', file: 'src/lib/components/DateRangePicker.svelte', status: 'done' },
					]
				},
				{ role: 'assistant', content: 'Quick question before I wire it up:' },
			]
		},
		// OpenClaw: no conversations (empty state)
	];
	
	let activeConversation = $state<string | null>(null);
	
	// Filter conversations by selected project
	const projectConversations = $derived(conversations.filter(c => c.projectId === selectedProject));
	
	// Derived: split by status (within current project)
	const workingConvs = $derived(projectConversations.filter(c => c.status === 'working'));
	const waitingConvs = $derived(projectConversations.filter(c => c.status === 'waiting'));
	const doneConvs = $derived(projectConversations.filter(c => c.status === 'done'));
	
	// Get conversation counts per project (for sidebar dots)
	function getProjectConvCounts(projectId: string) {
		const projConvs = conversations.filter(c => c.projectId === projectId);
		return {
			working: projConvs.filter(c => c.status === 'working').length,
			waiting: projConvs.filter(c => c.status === 'waiting').length,
			done: projConvs.filter(c => c.status === 'done').length,
		};
	}
	
	// Current conversation messages (for display)
	const currentMessages = $derived(
		activeConversation 
			? conversations.find(c => c.id === activeConversation)?.messages ?? []
			: []
	);
	
	// Active conversation helpers
	const activeConv = $derived(activeConversation ? conversations.find(c => c.id === activeConversation) : null);
	const isWaiting = $derived(activeConv?.status === 'waiting');
	const inputPlaceholder = $derived(activeConversation ? `Reply...` : 'Start a new task...');
	const inactiveWaitingOrDone = $derived([...waitingConvs, ...doneConvs].filter(c => c.id !== activeConversation));
	
	// Animation state for conversation switching
	let isAnimating = $state(false);
	let animatingFromId = $state<string | null>(null);
	
	// Ref for input textarea
	let inputRef = $state<HTMLTextAreaElement | null>(null);
	
	// Clear active conversation when switching projects
	function selectProject(projectId: string) {
		selectedProject = projectId;
		activeConversation = null;
		isAnimating = false;
	}
	
	// Animate conversation switch
	function switchToConversation(convId: string) {
		if (convId === activeConversation || isAnimating) return;
		
		animatingFromId = activeConversation;
		isAnimating = true;
		activeConversation = convId;
		
		// Reset animation state after animation completes
		setTimeout(() => {
			isAnimating = false;
			animatingFromId = null;
		}, 300);
	}
	
	// Select a skill and build the chain
	function selectSkill(skillName: string) {
		const skill = skills.find(s => s.name === skillName);
		if (!skill) return;
		
		// Build chain: start skill + any skills it calls
		const chain = [skillName, ...(skill.calls || [])];
		selectedSkillChain = chain;
		
		// Clear active conversation to show input
		activeConversation = null;
	}
	
	// Remove skill chain
	function clearSkillChain() {
		selectedSkillChain = [];
	}
	
	// Get skill by name
	function getSkill(name: string) {
		return skills.find(s => s.name === name);
	}
	
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			// Would send message
			chatInput = '';
			selectedSkillChain = [];
		}
	}
</script>

<div class="h-screen flex bg-zinc-950 text-zinc-100 overflow-hidden">
	<!-- Left Sidebar - Projects -->
	<aside 
		class="flex flex-col border-r border-zinc-800 bg-zinc-925 transition-all duration-200"
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
			{#each projects as project}
				{@const counts = getProjectConvCounts(project.id)}
				<button
					onclick={() => selectProject(project.id)}
					class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-left transition-colors relative"
					class:bg-zinc-800={selectedProject === project.id}
					class:text-zinc-100={selectedProject === project.id}
					class:text-zinc-400={selectedProject !== project.id}
					class:hover:bg-zinc-850={selectedProject !== project.id}
					class:hover:text-zinc-200={selectedProject !== project.id}
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
	
	<!-- Main Content Area -->
	<main class="flex-1 flex overflow-hidden">
		<!-- Project Panel -->
		<section class="w-80 flex-shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden bg-zinc-925/50">
			<!-- Project Header -->
			<header class="h-14 flex items-center gap-3 px-4 border-b border-zinc-800">
				<span class="text-xl">{projects.find(p => p.id === selectedProject)?.icon}</span>
				<h1 class="font-semibold">{projects.find(p => p.id === selectedProject)?.name}</h1>
			</header>
			
			<div class="flex-1 overflow-y-auto">
				<!-- Config Section -->
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
						<span class="ml-auto text-xs text-zinc-500">{configFiles.reduce((acc, f) => acc + (f.children?.length ?? 0), 0)}</span>
					</button>
					{#if configExpanded}
						<div class="px-2 pb-2">
							{#each configFiles as file}
								{@const isExpanded = expandedFolders.has(file.name)}
								<div>
									<button 
										onclick={() => {
											if (file.isFolder) {
												if (expandedFolders.has(file.name)) {
													expandedFolders = new Set([...expandedFolders].filter(f => f !== file.name));
												} else {
													expandedFolders = new Set([...expandedFolders, file.name]);
												}
											}
										}}
										class="w-full flex items-center gap-2 px-3 py-1 rounded text-sm hover:bg-zinc-800 text-left group"
										class:text-zinc-400={!file.change}
										class:hover:text-zinc-200={!file.change}
										class:text-emerald-400={file.change === 'added'}
										class:text-blue-400={file.change === 'changed'}
										class:text-red-400={file.change === 'deleted'}
									>
										{#if file.isFolder}
											<svg 
												class="w-3 h-3 transition-transform flex-shrink-0" 
												class:text-zinc-500={!file.change}
												class:text-emerald-500={file.change === 'added'}
												class:text-blue-500={file.change === 'changed'}
												class:text-red-500={file.change === 'deleted'}
												class:rotate-90={isExpanded}
												fill="none" stroke="currentColor" viewBox="0 0 24 24"
											>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
											</svg>
											<svg 
												class="w-4 h-4 flex-shrink-0 {!file.change ? 'text-amber-500/70' : ''}" 
												class:text-emerald-500={file.change === 'added'}
												class:text-blue-500={file.change === 'changed'}
												class:text-red-500={file.change === 'deleted'}
												fill="none" stroke="currentColor" viewBox="0 0 24 24"
											>
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
											</svg>
											<span class="flex-1 truncate">{file.name}</span>
											{#if file.children}
												<span class="text-xs text-zinc-600">{file.children.length}</span>
											{/if}
										{:else}
											<span class="truncate">{file.name}</span>
										{/if}
									</button>
									{#if file.isFolder && file.children && isExpanded}
										<div class="ml-4 border-l border-zinc-800 pl-2 mt-0.5 mb-0.5">
											{#each file.children as child}
												{@const childKey = `${file.name}${child.name}`}
												{@const childExpanded = expandedFolders.has(childKey)}
												<div>
													<button 
														onclick={() => {
															if (child.isFolder || child.fileCount) {
																if (expandedFolders.has(childKey)) {
																	expandedFolders = new Set([...expandedFolders].filter(f => f !== childKey));
																} else {
																	expandedFolders = new Set([...expandedFolders, childKey]);
																}
															}
														}}
														onmouseenter={() => {
															if (hoverTimeout) clearTimeout(hoverTimeout);
															hoverTimeout = setTimeout(() => {
																hoveredPlaybookItem = childKey;
															}, 100);
														}}
														onmouseleave={() => {
															if (hoverTimeout) clearTimeout(hoverTimeout);
															hoverTimeout = setTimeout(() => {
																hoveredPlaybookItem = null;
															}, 50);
														}}
														class="w-full flex items-start gap-2 px-3 py-1 rounded text-sm hover:bg-zinc-800 text-left group"
														class:text-zinc-500={!child.change}
														class:hover:text-zinc-300={!child.change}
														class:text-emerald-400={child.change === 'added'}
														class:text-blue-400={child.change === 'changed'}
														class:text-red-400={child.change === 'deleted'}
													>
														{#if child.isFolder || child.fileCount}
															<svg 
																class="w-3 h-3 mt-0.5 flex-shrink-0 transition-transform" 
																class:text-zinc-600={!child.change}
																class:text-emerald-500={child.change === 'added'}
																class:text-blue-500={child.change === 'changed'}
																class:text-red-500={child.change === 'deleted'}
																class:rotate-90={childExpanded} 
																fill="none" stroke="currentColor" viewBox="0 0 24 24"
															>
																<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
															</svg>
														{:else}
															<span class="w-3 h-3 flex-shrink-0"></span>
														{/if}
														<div class="flex-1 min-w-0">
															<div 
																class="text-xs font-medium"
																class:text-zinc-400={!child.change}
																class:group-hover:text-zinc-200={!child.change}
																class:text-emerald-400={child.change === 'added'}
																class:text-blue-400={child.change === 'changed'}
																class:text-red-400={child.change === 'deleted'}
															>
																{child.name}{#if child.fileCount}<span class="text-zinc-600 font-normal ml-1.5">{child.fileCount}</span>{/if}
															</div>
															{#if child.desc && hoveredPlaybookItem === childKey}
																<div class="text-xs text-zinc-500" transition:slide={{ duration: 150 }}>{child.desc}</div>
															{/if}
														</div>
													</button>
													{#if (child.isFolder || child.fileCount) && child.children && childExpanded}
														<div class="ml-4 border-l border-zinc-800 pl-2 mt-0.5 mb-0.5">
															{#each child.children as grandchild}
																{@const grandchildKey = `${childKey}${grandchild.name}`}
																{@const grandchildExpanded = expandedFolders.has(grandchildKey)}
																<div>
																	<button 
																		onclick={() => {
																			if (grandchild.isFolder || grandchild.children) {
																				if (expandedFolders.has(grandchildKey)) {
																					expandedFolders = new Set([...expandedFolders].filter(f => f !== grandchildKey));
																				} else {
																					expandedFolders = new Set([...expandedFolders, grandchildKey]);
																				}
																			}
																		}}
																		onmouseenter={() => {
																			if (hoverTimeout) clearTimeout(hoverTimeout);
																			hoverTimeout = setTimeout(() => {
																				hoveredPlaybookItem = grandchildKey;
																			}, 100);
																		}}
																		onmouseleave={() => {
																			if (hoverTimeout) clearTimeout(hoverTimeout);
																			hoverTimeout = setTimeout(() => {
																				hoveredPlaybookItem = null;
																			}, 50);
																		}}
																		class="w-full flex items-start gap-2 px-3 py-0.5 rounded text-sm hover:bg-zinc-800 text-left group"
																		class:text-zinc-500={!grandchild.change}
																		class:hover:text-zinc-300={!grandchild.change}
																		class:text-emerald-400={grandchild.change === 'added'}
																		class:text-blue-400={grandchild.change === 'changed'}
																		class:text-red-400={grandchild.change === 'deleted'}
																	>
																		{#if grandchild.isFolder || grandchild.children}
																			<svg 
																				class="w-3 h-3 mt-0.5 flex-shrink-0 transition-transform" 
																				class:text-zinc-600={!grandchild.change}
																				class:text-emerald-500={grandchild.change === 'added'}
																				class:text-blue-500={grandchild.change === 'changed'}
																				class:text-red-500={grandchild.change === 'deleted'}
																				class:rotate-90={grandchildExpanded} 
																				fill="none" stroke="currentColor" viewBox="0 0 24 24"
																			>
																				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
																			</svg>
																		{:else}
																			<span class="w-3 h-3 flex-shrink-0"></span>
																		{/if}
																		<div class="flex-1 min-w-0">
																			<div 
																				class="text-xs font-medium"
																				class:text-zinc-400={!grandchild.change}
																				class:group-hover:text-zinc-200={!grandchild.change}
																				class:text-emerald-400={grandchild.change === 'added'}
																				class:text-blue-400={grandchild.change === 'changed'}
																				class:text-red-400={grandchild.change === 'deleted'}
																			>{grandchild.name}</div>
																			{#if grandchild.desc && hoveredPlaybookItem === grandchildKey}
																				<div class="text-xs text-zinc-500" transition:slide={{ duration: 150 }}>{grandchild.desc}</div>
																			{/if}
																		</div>
																	</button>
																	{#if grandchild.isFolder && grandchild.children && grandchildExpanded}
																		<div class="ml-4 border-l border-zinc-800 pl-2 mt-0.5 mb-0.5">
																			{#each grandchild.children as greatgrandchild}
																				{@const greatgrandchildKey = `${grandchildKey}${greatgrandchild.name}`}
																				<button 
																					class="w-full flex items-start gap-2 px-3 py-1 rounded text-sm hover:bg-zinc-800 text-left group"
																					class:text-zinc-500={!greatgrandchild.change}
																					class:hover:text-zinc-300={!greatgrandchild.change}
																					class:text-emerald-400={greatgrandchild.change === 'added'}
																					class:text-blue-400={greatgrandchild.change === 'changed'}
																					class:text-red-400={greatgrandchild.change === 'deleted'}
																					onmouseenter={() => {
																						if (hoverTimeout) clearTimeout(hoverTimeout);
																						hoverTimeout = setTimeout(() => {
																							hoveredPlaybookItem = greatgrandchildKey;
																						}, 100);
																					}}
																					onmouseleave={() => {
																						if (hoverTimeout) clearTimeout(hoverTimeout);
																						hoverTimeout = setTimeout(() => {
																							hoveredPlaybookItem = null;
																						}, 50);
																					}}
																				>
																					<span class="w-3 h-3 flex-shrink-0"></span>
																					<div class="flex-1 min-w-0">
																						<div 
																							class="text-xs font-medium"
																							class:text-zinc-400={!greatgrandchild.change}
																							class:group-hover:text-zinc-200={!greatgrandchild.change}
																							class:text-emerald-400={greatgrandchild.change === 'added'}
																							class:text-blue-400={greatgrandchild.change === 'changed'}
																							class:text-red-400={greatgrandchild.change === 'deleted'}
																						>{greatgrandchild.name}</div>
																						{#if greatgrandchild.desc && hoveredPlaybookItem === greatgrandchildKey}
																							<div class="text-xs text-zinc-500" transition:slide={{ duration: 150 }}>{greatgrandchild.desc}</div>
																						{/if}
																					</div>
																				</button>
																			{/each}
																		</div>
																	{/if}
																</div>
															{/each}
														</div>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
				
				<!-- Changes Section -->
				<div class="border-t border-zinc-800">
					<div class="px-4 py-3">
						<div class="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-2">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							Changes
							<span class="ml-auto text-xs text-zinc-500">{changedFiles.length} files</span>
						</div>
						<div class="space-y-1">
							{#each changedFiles as file}
								<div class="flex items-center gap-2 text-xs px-1 py-0.5 rounded hover:bg-zinc-800/50">
									<span class="text-zinc-400 truncate flex-1 font-mono">{file.name}</span>
									<span class="text-emerald-400 flex-shrink-0">+{file.additions}</span>
									<span class="text-red-400 flex-shrink-0">-{file.deletions}</span>
								</div>
							{/each}
						</div>
					</div>
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
						<span class="ml-auto text-xs text-zinc-500">{skills.length}</span>
					</button>
					{#if skillsExpanded}
						<div class="px-2 pb-2">
							<!-- Repo skills -->
							{#each repoSkills as skill}
								<button 
									class="w-full flex items-center gap-2.5 px-3 py-1 rounded-lg hover:bg-zinc-800 text-left"
									onclick={() => selectSkill(skill.name)}
									onmouseenter={() => {
										if (hoverTimeout) clearTimeout(hoverTimeout);
										hoverTimeout = setTimeout(() => {
											hoveredSkill = skill.name;
										}, 100);
									}}
									onmouseleave={() => {
										if (hoverTimeout) clearTimeout(hoverTimeout);
										hoverTimeout = setTimeout(() => {
											hoveredSkill = null;
										}, 50);
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
									onclick={() => selectSkill(skill.name)}
									onmouseenter={() => {
										if (hoverTimeout) clearTimeout(hoverTimeout);
										hoverTimeout = setTimeout(() => {
											hoveredSkill = skill.name;
										}, 100);
									}}
									onmouseleave={() => {
										if (hoverTimeout) clearTimeout(hoverTimeout);
										hoverTimeout = setTimeout(() => {
											hoveredSkill = null;
										}, 50);
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
		
		<!-- Chat Area -->
		<section class="flex-1 flex flex-col overflow-hidden">
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
				{#if workingConvs.filter(c => c.id !== activeConversation).length > 0}
					<div class="border-b border-zinc-800 bg-zinc-900/50 px-4 py-2 space-y-1 overflow-hidden">
						{#each workingConvs.filter(c => c.id !== activeConversation) as conv (conv.id)}
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
					{#if activeConversation}
						{@const conv = conversations.find(c => c.id === activeConversation)}
						<div 
							class="flex-1 overflow-y-auto px-6 py-4 space-y-4"
							in:fly={{ y: 40, duration: 250, delay: 100, easing: quintOut }}
						>
						<!-- Conversation title -->
						<div class="flex items-center gap-2 mb-2">
							{#if conv?.status === 'working'}
								<span class="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
							{:else if conv?.status === 'waiting'}
								<span class="w-2 h-2 rounded-full bg-emerald-500"></span>
							{:else}
								<span class="w-2 h-2 rounded-full bg-zinc-500"></span>
							{/if}
							<h3 class="text-sm font-medium text-zinc-300">{conv?.title}</h3>
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
						{#if conv?.status === 'waiting' && conv?.waitingFor}
							<div class="flex gap-3">
								<img src="/axel.jpg" alt="Axel" class="w-7 h-7 rounded-full object-cover flex-shrink-0" />
								<div class="max-w-[80%] rounded-2xl px-4 py-2.5 bg-zinc-800">
									<p class="text-sm leading-relaxed">{conv.waitingFor}</p>
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
									class:bg-violet-900={i === 0}
									class:text-white={i === 0}
									class:bg-zinc-800={i > 0}
									class:text-zinc-300={i > 0}
								>
									<span>{skill.icon}</span>
									<span class="font-medium">{skill.name}</span>
									{#if i === 0}
										<button 
											onclick={clearSkillChain}
											class="ml-0.5 hover:text-zinc-300"
										>
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
											class:bg-violet-900={i === 0}
											class:text-white={i === 0}
											class:bg-zinc-800={i > 0}
											class:text-zinc-300={i > 0}
										>
											<span>{skill.icon}</span>
											<span class="font-medium">{skill.name}</span>
											{#if i === 0}
												<button 
													onclick={clearSkillChain}
													class="ml-0.5 hover:text-zinc-300"
												>
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
	</main>
</div>
