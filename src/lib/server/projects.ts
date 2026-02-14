import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import type { Project } from '$lib/types';

const DEFAULT_REPOS_ROOT = '~/projects';

function expandHome(input: string): string {
	if (!input.startsWith('~')) return input;
	const home = process.env.HOME ?? '';
	if (!home) return input;
	if (input === '~') return home;
	if (input.startsWith('~/')) return path.join(home, input.slice(2));
	return input;
}

function normalizeProjectId(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

function pickIcon(name: string): string {
	const lower = name.toLowerCase();
	if (lower.includes('deck')) return '🃏';
	if (lower.includes('research')) return '🔬';
	if (lower.includes('agent')) return '🤖';
	if (lower.includes('openclaw')) return '🦎';
	if (lower.includes('api') || lower.includes('server')) return '⚙️';
	return '📁';
}

export function resolveReposRoot(rootOverride?: string | null): string {
	const requested = rootOverride?.trim();
	const envRoot = process.env.DECK_REPOS_ROOT?.trim() || process.env.REPOS_ROOT?.trim();
	const configured = requested || envRoot || DEFAULT_REPOS_ROOT;
	return path.resolve(expandHome(configured));
}

export function isPathInside(parentPath: string, targetPath: string): boolean {
	const parent = path.resolve(parentPath);
	const target = path.resolve(targetPath);
	if (target === parent) return true;
	return target.startsWith(`${parent}${path.sep}`);
}

export function deriveProjectName(folderName: string): string {
	return folderName
		.split(/[-_]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export async function listProjects(rootOverride?: string | null): Promise<{ root: string; projects: Project[] }> {
	let root = resolveReposRoot(rootOverride);
	// If the requested root doesn't exist, fall back to the default
	if (!existsSync(root)) {
		const defaultRoot = resolveReposRoot(null);
		if (root !== defaultRoot && existsSync(defaultRoot)) {
			root = defaultRoot;
		} else {
			return { root, projects: [] };
		}
	}

	const entries = await readdir(root, { withFileTypes: true });
	const projects: Project[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		if (entry.name.startsWith('.')) continue;

		const projectPath = path.join(root, entry.name);
		projects.push({
			id: normalizeProjectId(entry.name),
			name: deriveProjectName(entry.name),
			path: projectPath,
			icon: pickIcon(entry.name)
		});
	}

	projects.sort((a, b) => a.name.localeCompare(b.name));
	return { root, projects };
}
