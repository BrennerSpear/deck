import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { openclawFetch } from '$lib/server/openclaw';

export const GET: RequestHandler = async () => {
	try {
		const response = await openclawFetch('/api/cron/jobs');

		if (!response.ok) {
			const text = await response.text();
			return json({ error: `Gateway returned ${response.status}: ${text}` }, { status: response.status });
		}

		const data = await response.json();
		return json(data);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch cron jobs';
		return json({ error: message }, { status: 502 });
	}
};
