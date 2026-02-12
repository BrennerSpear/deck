import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import type { AgentEvent } from '$lib/types';
import { mockAgentEvents } from '$lib/stores/tmux';

const EVENT_LOG = '/tmp/openclaw-tmux/agent-team-events.log';
const USE_MOCK_DATA = !existsSync(EVENT_LOG);

function parseEventLog(line: string): AgentEvent | null {
	// Format: [2026-02-12T05:30:00Z] [agent-team:teammate-idle] Teammate "researcher" went idle in ~/repos/project.
	const match = line.match(/\[([^\]]+)\] \[agent-team:(teammate-idle|task-completed)\] (.+)/);
	if (!match) return null;

	const [, timestamp, type, message] = match;

	// Extract agent name if present
	const agentMatch = message.match(/Teammate "([^"]+)"/);
	const repoMatch = message.match(/in (.+)\.$/);

	return {
		timestamp,
		type: type as 'teammate-idle' | 'task-completed',
		message,
		agent: agentMatch?.[1],
		repo: repoMatch?.[1]
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const since = url.searchParams.get('since');
	const sinceTimestamp = since ? new Date(since) : null;

	if (USE_MOCK_DATA) {
		const events = mockAgentEvents.filter(event => {
			if (!sinceTimestamp) return true;
			return new Date(event.timestamp) > sinceTimestamp;
		});
		return json({ events });
	}

	if (!existsSync(EVENT_LOG)) {
		return json({ events: [] });
	}

	try {
		const content = await readFile(EVENT_LOG, 'utf-8');
		const lines = content.split('\n').filter(line => line.trim());

		const events = lines
			.map(parseEventLog)
			.filter((event): event is AgentEvent => {
				if (!event) return false;
				if (!sinceTimestamp) return true;
				return new Date(event.timestamp) > sinceTimestamp;
			});

		return json({ events });
	} catch (error) {
		console.error('Failed to read event log:', error);
		return json({ events: [] });
	}
};
