import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	captureTmuxPane,
	formatTmuxError,
	getPaneCursorPosition,
	isTmuxNotInstalledError,
	isTmuxServerNotRunningError,
	isTmuxTargetMissingError
} from '$lib/server/tmux';

export const GET: RequestHandler = async ({ url }) => {
	const paneId = url.searchParams.get('pane');

	if (!paneId) {
		return json({ error: 'Pane ID required' }, { status: 400 });
	}

	try {
		// Fetch both content and cursor position in parallel
		const [content, cursor] = await Promise.all([
			captureTmuxPane(paneId),
			getPaneCursorPosition(paneId)
		]);

		return json({ content, cursor });
	} catch (error) {
		if (isTmuxServerNotRunningError(error) || isTmuxTargetMissingError(error)) {
			return json({ content: '', cursor: { x: 0, y: 0 } });
		}
		if (isTmuxNotInstalledError(error)) {
			return json({
				content: '',
				cursor: { x: 0, y: 0 },
				error: 'tmux is not installed on this machine.'
			}, { status: 503 });
		}
		return json({
			content: '',
			cursor: { x: 0, y: 0 },
			error: formatTmuxError(error)
		}, { status: 500 });
	}
};
