import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isPathInside, resolveReposRoot } from '$lib/server/projects';

const MAX_FILE_BYTES = 512 * 1024;

export const GET: RequestHandler = async ({ url }) => {
	const targetPath = url.searchParams.get('path');
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

	try {
		const content = await readFile(resolvedPath);
		if (content.byteLength > MAX_FILE_BYTES) {
			return json({ error: 'File too large to preview' }, { status: 413 });
		}
		return json({ content: content.toString('utf-8') });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to read file';
		return json({ error: message }, { status: 500 });
	}
};
