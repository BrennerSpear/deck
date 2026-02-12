/**
 * Web bridge for filesystem/project APIs.
 * In Tauri this would use native commands; in web we call SvelteKit endpoints.
 */

import type { Project, DirEntry } from '$lib/types';

const REPOS_ROOT_STORAGE_KEY = 'deck.reposRoot';
const DEFAULT_REPOS_ROOT = '~/repos';

let configuredReposRoot = DEFAULT_REPOS_ROOT;
let reposRootInitialized = false;

function ensureReposRootInitialized() {
	if (reposRootInitialized) return;
	reposRootInitialized = true;
	if (typeof window === 'undefined') return;
	const stored = localStorage.getItem(REPOS_ROOT_STORAGE_KEY);
	if (stored && stored.trim()) {
		configuredReposRoot = stored.trim();
	}
}

function persistReposRoot() {
	if (typeof window === 'undefined') return;
	localStorage.setItem(REPOS_ROOT_STORAGE_KEY, configuredReposRoot);
}

export function isTauri(): boolean {
	return false;
}

export function getReposRoot(): string {
	ensureReposRootInitialized();
	return configuredReposRoot;
}

export function setReposRoot(root: string): void {
	ensureReposRootInitialized();
	const trimmed = root.trim();
	configuredReposRoot = trimmed || DEFAULT_REPOS_ROOT;
	persistReposRoot();
}

// ── Filesystem Commands ────────────────────────────────────────────────────

export async function listDir(path: string, depth: number = 2): Promise<DirEntry[]> {
	try {
		const root = getReposRoot();
		const response = await fetch(
			`/api/fs/list?path=${encodeURIComponent(path)}&depth=${encodeURIComponent(String(depth))}&root=${encodeURIComponent(root)}`
		);
		if (!response.ok) {
			throw new Error(`Failed to list directory: ${response.status}`);
		}
		const data = await response.json();
		return data.entries as DirEntry[];
	} catch {
		return mockListDir(path, depth);
	}
}

export async function readFile(path: string): Promise<string> {
	try {
		const root = getReposRoot();
		const response = await fetch(
			`/api/fs/read?path=${encodeURIComponent(path)}&root=${encodeURIComponent(root)}`
		);
		if (!response.ok) {
			throw new Error(`Failed to read file: ${response.status}`);
		}
		const data = await response.json();
		return data.content as string;
	} catch {
		return mockReadFile(path);
	}
}

// ── Config Commands ────────────────────────────────────────────────────────

export async function loadConfig(): Promise<Project[]> {
	try {
		const root = getReposRoot();
		const response = await fetch(`/api/projects?root=${encodeURIComponent(root)}`);
		if (!response.ok) {
			throw new Error(`Failed to load projects: ${response.status}`);
		}
		const data = await response.json();
		if (typeof data.root === 'string' && data.root.trim()) {
			configuredReposRoot = data.root.trim();
			persistReposRoot();
		}
		return (data.projects as Project[]) ?? [];
	} catch {
		return mockLoadConfig();
	}
}

export async function saveConfig(_projects: Project[]): Promise<void> {
	return;
}

// ── Watch Commands ─────────────────────────────────────────────────────────

export async function watchDir(_path: string, _id: string): Promise<void> {
	return;
}

export async function unwatchDir(_id: string): Promise<void> {
	return;
}

// ── Dialog Commands ────────────────────────────────────────────────────────

export async function pickFolder(): Promise<string | null> {
	const path = prompt('Enter a folder path:');
	return path || null;
}

// ── Event Listener ─────────────────────────────────────────────────────────

export async function listenFsChange(_id: string, _callback: (event: unknown) => void): Promise<() => void> {
	return () => {};
}

// ── Mock implementations ───────────────────────────────────────────────────

let mockProjects: Project[] = [
	{ id: 'knowhere', name: 'Knowhere', path: '/home/brenner/repos/knowhere', icon: '🏜️' },
	{ id: 'agentboard', name: 'AgentBoard', path: '/home/brenner/repos/agentboard', icon: '📋' },
	{ id: 'clarity', name: 'Clarity', path: '/home/brenner/repos/clarity', icon: '💎' },
	{ id: 'openclaw', name: 'OpenClaw', path: '/home/brenner/repos/openclaw', icon: '🦎' },
	{ id: 'research', name: 'Research', path: '/home/brenner/repos/research', icon: '🔬' },
];

function mockLoadConfig(): Project[] {
	return [...mockProjects];
}

function mockListDir(path: string, depth: number): DirEntry[] {
	return [
		{
			name: 'AGENTS.md',
			path: `${path}/AGENTS.md`,
			is_dir: false,
			is_file: true,
			size: 4200,
		},
		{
			name: 'skills',
			path: `${path}/skills`,
			is_dir: true,
			is_file: false,
			children: depth > 0 ? [
				{ name: 'research', path: `${path}/skills/research`, is_dir: true, is_file: false, children: [
					{ name: 'SKILL.md', path: `${path}/skills/research/SKILL.md`, is_dir: false, is_file: true, size: 1200 },
				]},
				{ name: 'commit', path: `${path}/skills/commit`, is_dir: true, is_file: false, children: [
					{ name: 'SKILL.md', path: `${path}/skills/commit/SKILL.md`, is_dir: false, is_file: true, size: 800 },
				]},
				{ name: 'develop', path: `${path}/skills/develop`, is_dir: true, is_file: false, children: [
					{ name: 'SKILL.md', path: `${path}/skills/develop/SKILL.md`, is_dir: false, is_file: true, size: 2000 },
				]},
			] : undefined,
		},
		{
			name: 'hooks',
			path: `${path}/hooks`,
			is_dir: true,
			is_file: false,
			children: depth > 0 ? [
				{ name: 'pre-commit.md', path: `${path}/hooks/pre-commit.md`, is_dir: false, is_file: true, size: 600 },
				{ name: 'post-push.md', path: `${path}/hooks/post-push.md`, is_dir: false, is_file: true, size: 500 },
			] : undefined,
		},
		{
			name: 'context',
			path: `${path}/context`,
			is_dir: true,
			is_file: false,
			children: depth > 0 ? [
				{ name: 'architecture.md', path: `${path}/context/architecture.md`, is_dir: false, is_file: true, size: 1500 },
				{ name: 'conventions.md', path: `${path}/context/conventions.md`, is_dir: false, is_file: true, size: 900 },
			] : undefined,
		},
		{
			name: 'README.md',
			path: `${path}/README.md`,
			is_dir: false,
			is_file: true,
			size: 2000,
		},
	];
}

function mockReadFile(path: string): string {
	if (path.includes('AGENTS.md')) {
		return `# AGENTS.md\n\nThis is the agent configuration for the project.\n\n## Skills\n\nAvailable skills are defined in the \`skills/\` directory.\n\n## Hooks\n\nHooks are defined in the \`hooks/\` directory.\n`;
	}
	if (path.includes('SKILL.md') || path.includes('skills/')) {
		const name = path.split('/').slice(-2, -1)[0] || 'unknown';
		return `---\nname: ${name}\ndescription: A skill for ${name}\n---\n\n# ${name}\n\nThis skill handles ${name} operations.\n`;
	}
	if (path.includes('README.md')) {
		return `# Project\n\nThis is a project managed by Deck.\n`;
	}
	return `# ${path.split('/').pop()}\n\nFile contents would be loaded from disk when running in Tauri.\n`;
}
