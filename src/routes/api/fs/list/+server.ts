import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import type { DirEntry } from '$lib/types';
import { isPathInside, resolveReposRoot } from '$lib/server/projects';

const MAX_DEPTH = 5;
const MAX_ENTRIES_PER_DIR = 200;

async function buildTree(currentPath: string, depth: number): Promise<DirEntry[]> {
	const items = await readdir(currentPath, { withFileTypes: true });
	const limited = items
		.filter((item) => !item.name.startsWith('.'))
		.sort((a, b) => {
			if (a.isDirectory() && !b.isDirectory()) return -1;
			if (!a.isDirectory() && b.isDirectory()) return 1;
			return a.name.localeCompare(b.name);
		})
		.slice(0, MAX_ENTRIES_PER_DIR);

	const entries: DirEntry[] = [];

	for (const item of limited) {
		const itemPath = path.join(currentPath, item.name);
		if (item.isDirectory()) {
			const children = depth > 0 ? await buildTree(itemPath, depth - 1) : undefined;
			entries.push({
				name: item.name,
				path: itemPath,
				is_dir: true,
				is_file: false,
				children
			});
			continue;
		}

		let size: number | undefined;
		try {
			const stats = await stat(itemPath);
			size = stats.size;
		} catch {
			size = undefined;
		}

		entries.push({
			name: item.name,
			path: itemPath,
			is_dir: false,
			is_file: true,
			size
		});
	}

	return entries;
}

export const GET: RequestHandler = async ({ url }) => {
	const targetPath = url.searchParams.get('path');
	const depthRaw = url.searchParams.get('depth');

	if (!targetPath) {
		return json({ error: 'path query parameter is required' }, { status: 400 });
	}

	const resolvedPath = path.resolve(targetPath);
	const root = resolveReposRoot(url.searchParams.get('root'));
	if (!isPathInside(root, resolvedPath)) {
		return json({ error: 'Path is outside configured repos root' }, { status: 403 });
	}

	if (!existsSync(resolvedPath)) {
		return json({ error: 'Path does not exist' }, { status: 404 });
	}

	let depth = Number.parseInt(depthRaw ?? '2', 10);
	if (!Number.isFinite(depth) || depth < 0) depth = 2;
	depth = Math.min(depth, MAX_DEPTH);

	try {
		const entries = await buildTree(resolvedPath, depth);
		return json({ entries });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to list directory';
		return json({ error: message }, { status: 500 });
	}
};
