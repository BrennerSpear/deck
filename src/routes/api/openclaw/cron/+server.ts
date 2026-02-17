import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

function humanizeCron(expr: string): string {
	const parts = expr.trim().split(/\s+/);
	if (parts.length < 5) return expr;
	const [min, hour, dom, , dow] = parts;

	// Every N minutes
	if (min.startsWith('*/') && hour === '*') return `every ${min.slice(2)}m`;
	// Every hour at :MM
	if (min !== '*' && hour === '*') return `hourly at :${min.padStart(2, '0')}`;
	// Every N hours
	if (min === '0' && hour.startsWith('*/')) return `every ${hour.slice(2)}h`;
	// Daily at HH:MM
	if (min !== '*' && hour !== '*' && dom === '*' && dow === '*') {
		const h = parseInt(hour);
		const ampm = h >= 12 ? 'PM' : 'AM';
		const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
		return `daily ${h12}:${min.padStart(2, '0')} ${ampm}`;
	}
	return expr;
}

function formatSchedule(schedule: Record<string, unknown>): string {
	switch (schedule.kind) {
		case 'cron':
			return humanizeCron(schedule.expr as string);
		case 'every': {
			const ms = schedule.everyMs as number;
			if (ms >= 86_400_000) return `every ${Math.round(ms / 86_400_000)}d`;
			if (ms >= 3_600_000) return `every ${Math.round(ms / 3_600_000)}h`;
			if (ms >= 60_000) return `every ${Math.round(ms / 60_000)}m`;
			return `every ${Math.round(ms / 1000)}s`;
		}
		case 'at': {
			const d = new Date(schedule.at as string);
			return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
		}
		default:
			return JSON.stringify(schedule);
	}
}

export const GET: RequestHandler = async () => {
	try {
		const { stdout } = await execAsync('openclaw cron list --json', {
			timeout: 10000,
			env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}` }
		});
		const data = JSON.parse(stdout);
		const jobs = (data.jobs ?? []).map(
			(j: Record<string, unknown>) => {
				const state = (j.state ?? {}) as Record<string, unknown>;
				return {
					id: j.id,
					name: j.name ?? j.id,
					enabled: j.enabled ?? true,
					schedule: formatSchedule((j.schedule ?? {}) as Record<string, unknown>),
					lastRun: state.lastRunAtMs
						? new Date(state.lastRunAtMs as number).toISOString()
						: undefined,
					lastStatus: state.lastStatus ?? null,
					consecutiveErrors: (state.consecutiveErrors as number) ?? 0,
					lastError: state.lastError ?? null,
					model: ((j.payload ?? {}) as Record<string, unknown>).model ?? null,
					systemPrompt: ((j.payload ?? {}) as Record<string, unknown>).message ?? null,
					sessionTarget: j.sessionTarget ?? null
				};
			}
		);
		return json(jobs);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch cron jobs';
		return json({ error: message }, { status: 502 });
	}
};
