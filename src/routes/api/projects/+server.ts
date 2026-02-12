import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listProjects } from '$lib/server/projects';

export const GET: RequestHandler = async ({ url }) => {
	const root = url.searchParams.get('root');

	try {
		const result = await listProjects(root);
		return json(result);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load projects';
		return json({ root: '', projects: [], error: message }, { status: 500 });
	}
};
