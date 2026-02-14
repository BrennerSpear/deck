import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openclawFetch } from '$lib/server/openclaw';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const active = url.searchParams.get('active') ?? '30';
		const response = await openclawFetch(`/api/sessions?active=${active}`);

		if (!response.ok) {
			const text = await response.text();
			return json({ error: `Gateway returned ${response.status}: ${text}` }, { status: response.status });
		}

		const data = await response.json();
		return json(data);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch sessions';
		return json({ error: message }, { status: 502 });
	}
};
