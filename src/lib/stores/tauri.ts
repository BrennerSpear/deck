/**
 * Tauri bridge — wraps Tauri commands with a browser fallback for dev mode.
 * When running outside Tauri (e.g., `npm run dev` in browser), it uses mock data.
 */

import type { Project, DirEntry } from '$lib/types';

// Detect if we're running inside Tauri
function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// ── Invoke wrapper ─────────────────────────────────────────────────────────

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
	if (!isTauri()) {
		throw new Error(`Tauri not available — cannot invoke '${cmd}'`);
	}
	const { invoke: tauriInvoke } = await import('@tauri-apps/api/core');
	return tauriInvoke<T>(cmd, args);
}

// ── Filesystem Commands ────────────────────────────────────────────────────

export async function listDir(path: string, depth: number = 2): Promise<DirEntry[]> {
	if (!isTauri()) {
		return mockListDir(path, depth);
	}
	return invoke<DirEntry[]>('list_dir', { path, depth });
}

export async function readFile(path: string): Promise<string> {
	if (!isTauri()) {
		return mockReadFile(path);
	}
	return invoke<string>('read_file', { path });
}

// ── Config Commands ────────────────────────────────────────────────────────

export async function loadConfig(): Promise<Project[]> {
	if (!isTauri()) {
		return mockLoadConfig();
	}
	return invoke<Project[]>('load_config');
}

export async function saveConfig(projects: Project[]): Promise<void> {
	if (!isTauri()) {
		mockSaveConfig(projects);
		return;
	}
	return invoke<void>('save_config', { projects });
}

// ── Watch Commands ─────────────────────────────────────────────────────────

export async function watchDir(path: string, id: string): Promise<void> {
	if (!isTauri()) return;
	return invoke<void>('watch_dir', { path, id });
}

export async function unwatchDir(id: string): Promise<void> {
	if (!isTauri()) return;
	return invoke<void>('unwatch_dir', { id });
}

// ── Dialog Commands ────────────────────────────────────────────────────────

export async function pickFolder(): Promise<string | null> {
	if (!isTauri()) {
		// In browser dev mode, prompt for a path
		const path = prompt('Enter a folder path (Tauri not available):');
		return path || null;
	}
	const { open } = await import('@tauri-apps/plugin-dialog');
	const selected = await open({
		directory: true,
		multiple: false,
		title: 'Select a project folder',
	});
	return selected as string | null;
}

// ── Event Listener ─────────────────────────────────────────────────────────

export async function listenFsChange(id: string, callback: (event: unknown) => void): Promise<() => void> {
	if (!isTauri()) {
		return () => {};
	}
	const { listen } = await import('@tauri-apps/api/event');
	const unlisten = await listen(`fs-change:${id}`, (event) => {
		callback(event.payload);
	});
	return unlisten;
}

// ── Re-export isTauri for components ───────────────────────────────────────

export { isTauri };

// ── Mock implementations for browser dev mode ──────────────────────────────

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

function mockSaveConfig(projects: Project[]): void {
	mockProjects = [...projects];
}

function mockListDir(path: string, depth: number): DirEntry[] {
	// Return a realistic-looking file tree
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
