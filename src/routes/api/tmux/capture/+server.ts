import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	captureTmuxPane,
	formatTmuxError,
	isTmuxNotInstalledError,
	isTmuxServerNotRunningError,
	isTmuxTargetMissingError
} from '$lib/server/tmux';

async function capturePaneContent(paneId: string): Promise<string> {
	return captureTmuxPane(paneId);
}

export const GET: RequestHandler = async ({ url }) => {
	const paneId = url.searchParams.get('pane');

	if (!paneId) {
		return json({ error: 'Pane ID required' }, { status: 400 });
	}

	try {
		const content = await capturePaneContent(paneId);
		return json({ content });
	} catch (error) {
		if (isTmuxServerNotRunningError(error) || isTmuxTargetMissingError(error)) {
			return json({ content: '' });
		}
		if (isTmuxNotInstalledError(error)) {
			return json({ content: '', error: 'tmux is not installed on this machine.' }, { status: 503 });
		}
		return json({ content: '', error: formatTmuxError(error) }, { status: 500 });
	}
};
