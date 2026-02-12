import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { TmuxSessionsState } from '$lib/types';
import {
	captureTmuxPaneTail,
	epochToIso,
	extractLastLogLine,
	formatTmuxError,
	inferAgent,
	inferActivityState,
	inferStatus,
	isTmuxNotInstalledError,
	isTmuxServerNotRunningError,
	isTmuxTargetMissingError,
	killTmuxSession,
	listTmuxPanes,
	listTmuxSessions
} from '$lib/server/tmux';

const STATE_FILE = `${process.env.HOME ?? ''}/.openclaw/workspace/state/tmux-sessions.json`;

async function loadTmuxSessions(): Promise<TmuxSessionsState> {
	if (!existsSync(STATE_FILE)) return { sessions: {} };

	try {
		const content = await readFile(STATE_FILE, 'utf-8');
		return JSON.parse(content);
	} catch (error) {
		console.error('Failed to load tmux sessions:', error);
		return { sessions: {} };
	}
}

export const GET: RequestHandler = async () => {
	const state = await loadTmuxSessions();

	try {
		const liveSessions = await listTmuxSessions();
		if (liveSessions.length === 0) {
			return json({ sessions: {} });
		}

		let panes: Awaited<ReturnType<typeof listTmuxPanes>> = [];
		try {
			panes = await listTmuxPanes();
		} catch (paneError) {
			if (!isTmuxServerNotRunningError(paneError)) {
				console.error('Failed to read tmux panes while loading sessions:', paneError);
			}
		}
		const panesBySession = new Map<string, (typeof panes)[number][]>();

		for (const pane of panes) {
			const existing = panesBySession.get(pane.sessionName);
			if (existing) {
				existing.push(pane);
			} else {
				panesBySession.set(pane.sessionName, [pane]);
			}
		}

		const sessions: TmuxSessionsState['sessions'] = {};
		const sessionEntries = await Promise.all(
			liveSessions.map(async (live) => {
				const metadata = state.sessions[live.name];
				const paneList = panesBySession.get(live.name) ?? [];
				const activePane = paneList.find((pane) => pane.isActive) ?? paneList[0];
				const currentCommand = activePane?.currentCommand;
				const inferredStatus = inferStatus(live.activityEpoch, live.attachedClients, currentCommand);
				const status =
					metadata?.status === 'running' || metadata?.status === 'idle'
						? metadata.status
						: inferredStatus;
				let lastLine = '';
				if (activePane?.id) {
					try {
						const tail = await captureTmuxPaneTail(activePane.id, 40);
						lastLine = extractLastLogLine(tail);
					} catch (captureError) {
						if (!isTmuxTargetMissingError(captureError)) {
							console.error(`Failed to capture preview for ${live.name}:`, captureError);
						}
					}
				}

				const session = {
					name: live.name,
					agent: metadata?.agent ?? inferAgent(live.name, currentCommand),
					repo: metadata?.repo ?? activePane?.currentPath ?? '~',
					systemPrompt: metadata?.systemPrompt,
					topic: metadata?.topic,
					created: metadata?.created ?? epochToIso(live.createdEpoch),
					lastUsed: epochToIso(live.activityEpoch),
					status,
					currentCommand,
					activePaneId: activePane?.id,
					lastLine,
					activityState: status === 'running' ? inferActivityState(currentCommand) : 'waiting'
				};
				return [live.name, session] as const;
			})
		);

		for (const [sessionName, session] of sessionEntries) {
			sessions[sessionName] = session;
		}

		return json({ sessions });
	} catch (error) {
		if (isTmuxServerNotRunningError(error)) {
			return json({ sessions: {} });
		}
		if (isTmuxNotInstalledError(error)) {
			return json({ sessions: {}, error: 'tmux is not installed on this machine.' }, { status: 503 });
		}
		return json(
			{ sessions: {}, error: `Failed to read tmux sessions: ${formatTmuxError(error)}` },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	const sessionName = url.searchParams.get('name');

	if (!sessionName) {
		return json({ error: 'Session name required' }, { status: 400 });
	}

	try {
		await killTmuxSession(sessionName);
		return json({ success: true });
	} catch (error) {
		if (isTmuxTargetMissingError(error) || isTmuxServerNotRunningError(error)) {
			return json({ error: `Session "${sessionName}" not found.` }, { status: 404 });
		}
		if (isTmuxNotInstalledError(error)) {
			return json({ error: 'tmux is not installed on this machine.' }, { status: 503 });
		}
		return json({ error: formatTmuxError(error) }, { status: 500 });
	}
};
