import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
	formatTmuxError,
	isTmuxNotInstalledError,
	isTmuxTargetMissingError
} from '$lib/server/tmux';

const execFileAsync = promisify(execFile);

interface SendKeysRequest {
	paneId: string;
	keys: string;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: SendKeysRequest;
	try {
		body = await request.json() as SendKeysRequest;
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const { paneId, keys } = body;

	if (!paneId || !keys) {
		return json({ error: 'Pane ID and keys are required' }, { status: 400 });
	}

	try {
		// Map common escape sequences to tmux key names
		const keyMap: Record<string, string> = {
			'\r': 'Enter',
			'\n': 'Enter',
			'\t': 'Tab',
			'\x7f': 'BSpace',
			'\x1b': 'Escape',
			'\x1b[A': 'Up',
			'\x1b[B': 'Down',
			'\x1b[C': 'Right',
			'\x1b[D': 'Left',
			'\x1b[H': 'Home',
			'\x1b[F': 'End',
			'\x1b[3~': 'Delete',
			'\x1b[5~': 'PageUp',
			'\x1b[6~': 'PageDown',
		};

		const keyName = keyMap[keys];
		if (keyName) {
			// Send as key name (without -l flag)
			await execFileAsync('tmux', ['send-keys', '-t', paneId, keyName]);
		} else if (keys.startsWith('\x1b')) {
			// Other escape sequences - send as literal
			await execFileAsync('tmux', ['send-keys', '-t', paneId, '-l', keys]);
		} else {
			// Regular characters - send as literal
			await execFileAsync('tmux', ['send-keys', '-t', paneId, '-l', keys]);
		}

		return json({ success: true });
	} catch (error) {
		if (isTmuxTargetMissingError(error)) {
			return json({ error: `Pane "${paneId}" not found.` }, { status: 404 });
		}
		if (isTmuxNotInstalledError(error)) {
			return json({ error: 'tmux is not installed on this machine.' }, { status: 503 });
		}
		return json({ error: formatTmuxError(error) }, { status: 500 });
	}
};
