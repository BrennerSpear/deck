/**
 * Tmux store — provides mock data for development
 * In production, this data would come from the API routes
 */

import type { TmuxSession } from '$lib/types';

export const mockTmuxSessions: Record<string, TmuxSession> = {
	'exfoliate-shop': {
		name: 'exfoliate-shop',
		agent: 'claude',
		repo: '~/repos/exfoliate-shop',
		systemPrompt: 'You are a coding agent for an e-commerce store',
		topic: 'Sticker store development',
		created: '2026-02-11T10:30:00Z',
		lastUsed: '2026-02-12T05:30:00Z',
		status: 'running'
	},
	'knowhere-backend': {
		name: 'knowhere-backend',
		agent: 'codex',
		repo: '~/repos/knowhere',
		systemPrompt: 'You are a backend development specialist',
		topic: 'API refactoring',
		created: '2026-02-10T14:20:00Z',
		lastUsed: '2026-02-12T05:25:00Z',
		status: 'idle'
	},
	'clarity-ui': {
		name: 'clarity-ui',
		agent: 'claude',
		repo: '~/repos/clarity',
		topic: 'Dashboard UI improvements',
		created: '2026-02-11T16:00:00Z',
		lastUsed: '2026-02-12T03:15:00Z',
		status: 'done'
	}
};

export const mockAgentEvents = [
	{
		timestamp: '2026-02-12T05:30:00Z',
		type: 'teammate-idle' as const,
		message: 'Teammate "researcher" went idle in ~/repos/exfoliate-shop.',
		agent: 'researcher',
		repo: '~/repos/exfoliate-shop'
	},
	{
		timestamp: '2026-02-12T05:28:00Z',
		type: 'task-completed' as const,
		message: 'Task "implement auth" completed in ~/repos/knowhere.',
		repo: '~/repos/knowhere'
	},
	{
		timestamp: '2026-02-12T05:25:00Z',
		type: 'teammate-idle' as const,
		message: 'Teammate "tester" went idle in ~/repos/clarity.',
		agent: 'tester',
		repo: '~/repos/clarity'
	}
];

export const mockPaneContent = `
\x1b[32m✓\x1b[0m Starting development server...
\x1b[36minfo\x1b[0m  - SvelteKit running on \x1b[1mhttp://localhost:5173\x1b[0m

\x1b[33m▶\x1b[0m Building routes...
  \x1b[2m/\x1b[0m
  \x1b[2m/mission-control\x1b[0m
  \x1b[2m/api/tmux/sessions\x1b[0m

\x1b[32m✓\x1b[0m Build complete

\x1b[2m[05:30:15]\x1b[0m \x1b[36mGET\x1b[0m /api/tmux/sessions \x1b[32m200\x1b[0m in 12ms
\x1b[2m[05:30:16]\x1b[0m \x1b[36mGET\x1b[0m /api/tmux/panes?session=exfoliate-shop \x1b[32m200\x1b[0m in 8ms
\x1b[2m[05:30:17]\x1b[0m \x1b[36mGET\x1b[0m /api/tmux/capture?pane=%0 \x1b[32m200\x1b[0m in 5ms

Agent working on task: \x1b[1mImplement shopping cart\x1b[0m
  \x1b[2m- Adding cart state management\x1b[0m
  \x1b[2m- Creating checkout flow\x1b[0m
  \x1b[2m- Writing tests\x1b[0m

\x1b[32m✓\x1b[0m Task completed successfully
`;
