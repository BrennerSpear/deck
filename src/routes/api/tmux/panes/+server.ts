import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { TmuxPane } from '$lib/types';
import {
	formatTmuxError,
	isTmuxNotInstalledError,
	isTmuxServerNotRunningError,
	isTmuxTargetMissingError,
	listTmuxPanes
} from '$lib/server/tmux';

async function getTmuxPanes(sessionName: string): Promise<TmuxPane[]> {
	const panes = await listTmuxPanes(sessionName);
	const result: TmuxPane[] = [];

	for (const pane of panes) {
		result.push({
			id: pane.id,
			width: pane.width,
			height: pane.height,
			currentCommand: pane.currentCommand,
			currentPath: pane.currentPath
		});
	}

	return result;
}

export const GET: RequestHandler = async ({ url }) => {
	const sessionName = url.searchParams.get('session');

	if (!sessionName) {
		return json({ error: 'Session name required' }, { status: 400 });
	}

	try {
		const panes = await getTmuxPanes(sessionName);
		return json({ panes });
	} catch (error) {
		if (isTmuxServerNotRunningError(error)) {
			return json({ panes: [] });
		}
		if (isTmuxTargetMissingError(error)) {
			return json({ panes: [], error: `Session "${sessionName}" not found.` }, { status: 404 });
		}
		if (isTmuxNotInstalledError(error)) {
			return json({ panes: [], error: 'tmux is not installed on this machine.' }, { status: 503 });
		}
		return json({ panes: [], error: formatTmuxError(error) }, { status: 500 });
	}
};
