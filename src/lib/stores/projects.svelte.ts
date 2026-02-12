/**
 * Project store — manages the list of projects, their file trees, and selection state.
 * Uses Svelte 5 runes for reactivity.
 */

import type { Project, DirEntry, Conversation } from '$lib/types';
import * as tauri from '$lib/stores/tauri';

// ── Project State ──────────────────────────────────────────────────────────

const HIDDEN_PROJECTS_STORAGE_KEY = 'deck.hiddenProjects';

let projects = $state<Project[]>([]);
let selectedProjectId = $state<string | null>(null);
let projectTrees = $state<Record<string, DirEntry[]>>({});
let loading = $state(false);
let reposRoot = $state('~/repos');
let hiddenProjectIds = $state<string[]>([]);
let hiddenProjectsInitialized = false;

function initializeHiddenProjects() {
	if (hiddenProjectsInitialized) return;
	hiddenProjectsInitialized = true;
	if (typeof window === 'undefined') return;
	const raw = localStorage.getItem(HIDDEN_PROJECTS_STORAGE_KEY);
	if (!raw) return;

	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed)) {
			hiddenProjectIds = parsed.filter((value): value is string => typeof value === 'string');
		}
	} catch {
		hiddenProjectIds = [];
	}
}

function persistHiddenProjects() {
	if (typeof window === 'undefined') return;
	localStorage.setItem(HIDDEN_PROJECTS_STORAGE_KEY, JSON.stringify(hiddenProjectIds));
}

function isProjectVisible(projectId: string): boolean {
	return !hiddenProjectIds.includes(projectId);
}

// ── File Trees ─────────────────────────────────────────────────────────────

function getProjectTree(projectId: string): DirEntry[] {
	return projectTrees[projectId] ?? [];
}

// ── Conversations (rich mock data from main branch UI) ─────────────────────

const mockConversations: Conversation[] = [
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
];

let conversations = $state<Conversation[]>(mockConversations);

// ── Actions ────────────────────────────────────────────────────────────────

async function init() {
	loading = true;
	try {
		initializeHiddenProjects();
		reposRoot = tauri.getReposRoot();
		const loaded = await tauri.loadConfig();
		projects = loaded;
		const loadedProjectIds = new Set(loaded.map((project) => project.id));
		const nextHiddenProjectIds = hiddenProjectIds.filter((projectId) => loadedProjectIds.has(projectId));
		if (nextHiddenProjectIds.length !== hiddenProjectIds.length) {
			hiddenProjectIds = nextHiddenProjectIds;
			persistHiddenProjects();
		}

		const nextTrees: Record<string, DirEntry[]> = {};
		for (const project of loaded) {
			const existingTree = projectTrees[project.id];
			if (existingTree) {
				nextTrees[project.id] = existingTree;
			}
		}
		projectTrees = nextTrees;

		if (loaded.length === 0) {
			selectedProjectId = null;
			projectTrees = {};
			return;
		}

		const visibleProjects = loaded.filter((project) => isProjectVisible(project.id));
		if (visibleProjects.length === 0) {
			selectedProjectId = null;
			return;
		}

		const stillExistsAndVisible = visibleProjects.some((project) => project.id === selectedProjectId);
		if (!selectedProjectId || !stillExistsAndVisible) {
			selectedProjectId = visibleProjects[0].id;
		}

		if (selectedProjectId) {
			await refreshProjectTree(selectedProjectId);
		}
	} catch (e) {
		console.error('Failed to load config:', e);
	} finally {
		loading = false;
	}
}

async function addProject(path: string, name?: string, icon?: string): Promise<Project | null> {
	const folderName = path.split('/').pop() ?? 'project';
	const id = folderName.toLowerCase().replace(/[^a-z0-9]/g, '-');

	// Check if already added
	if (projects.some(p => p.path === path)) {
		return null;
	}

	const project: Project = {
		id,
		name: name ?? folderName,
		path,
		icon: icon ?? '📁',
	};

	projects = [...projects, project];
	await refreshProjectTree(id);

	// Select the new project
	selectedProjectId = id;

	return project;
}

async function removeProject(id: string) {
	projects = projects.filter(p => p.id !== id);
	delete projectTrees[id];
	hiddenProjectIds = hiddenProjectIds.filter((projectId) => projectId !== id);
	persistHiddenProjects();

	if (selectedProjectId === id) {
		const nextVisible = projects.find((project) => isProjectVisible(project.id));
		selectedProjectId = nextVisible?.id ?? null;
	}
}

async function refreshProjectTree(projectId: string) {
	const project = projects.find(p => p.id === projectId);
	if (!project) return;

	try {
		const tree = await tauri.listDir(project.path, 3);
		projectTrees = { ...projectTrees, [projectId]: tree };
	} catch (e) {
		console.error(`Failed to load tree for ${project.name}:`, e);
		projectTrees = { ...projectTrees, [projectId]: [] };
	}
}

function selectProject(id: string) {
	if (!isProjectVisible(id)) return;
	selectedProjectId = id;
	if (!projectTrees[id]) {
		refreshProjectTree(id);
	}
}

async function addProjectViaDialog() {
	const path = await tauri.pickFolder();
	if (path) {
		await addProject(path);
	}
}

async function setReposRoot(nextRoot: string) {
	tauri.setReposRoot(nextRoot);
	reposRoot = tauri.getReposRoot();
	await init();
}

async function refreshProjects() {
	await init();
}

function hideProject(projectId: string) {
	if (hiddenProjectIds.includes(projectId)) return;
	hiddenProjectIds = [...hiddenProjectIds, projectId];
	persistHiddenProjects();
	delete projectTrees[projectId];

	if (selectedProjectId === projectId) {
		const nextVisible = projects.find((project) => isProjectVisible(project.id));
		selectedProjectId = nextVisible?.id ?? null;
		if (selectedProjectId) {
			refreshProjectTree(selectedProjectId);
		}
	}
}

function unhideProject(projectId: string) {
	if (!hiddenProjectIds.includes(projectId)) return;
	hiddenProjectIds = hiddenProjectIds.filter((id) => id !== projectId);
	persistHiddenProjects();

	if (!selectedProjectId) {
		selectedProjectId = projectId;
		refreshProjectTree(projectId);
	}
}

// ── Export reactive getters and actions ─────────────────────────────────────

export const projectStore = {
	get projects() { return projects.filter((project) => isProjectVisible(project.id)); },
	get hiddenProjects() { return projects.filter((project) => !isProjectVisible(project.id)); },
	get selectedProjectId() { return selectedProjectId; },
	get selectedProject() { return projects.find(p => p.id === selectedProjectId) ?? null; },
	get loading() { return loading; },
	get reposRoot() { return reposRoot; },
	get conversations() { return conversations; },

	getProjectTree,
	getProjectConversations(projectId: string) {
		return conversations.filter(c => c.projectId === projectId);
	},

	init,
	addProject,
	removeProject,
	refreshProjectTree,
	selectProject,
	addProjectViaDialog,
	setReposRoot,
	refreshProjects,
	hideProject,
	unhideProject,
};
