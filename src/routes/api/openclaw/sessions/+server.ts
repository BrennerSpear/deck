import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export const GET: RequestHandler = async ({ url }) => {
	try {
		const active = url.searchParams.get('active') || '30';
		const { stdout } = await execAsync(`openclaw sessions list --json --active ${active}`, {
			timeout: 10000,
			maxBuffer: 1024 * 1024 * 5,
			env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` }
		});
		const data = JSON.parse(stdout);
		const sessions = (data.sessions ?? []).map(
			(s: Record<string, unknown>) => ({
				sessionKey: s.key,
				kind: s.kind,
				model: s.model ?? 'unknown',
				tokensUsed: (s.totalTokens as number) ?? 0,
				duration: Math.round(((s.ageMs as number) ?? 0) / 1000),
				status: (s.ageMs as number) < 60_000 ? 'running' : 'idle',
				updatedAt: s.updatedAt
					? new Date(s.updatedAt as number).toISOString()
					: undefined
			})
		);
		return json({ sessions });
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch sessions';
		return json({ error: message }, { status: 502 });
	}
};
