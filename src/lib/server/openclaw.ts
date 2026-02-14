import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';

const GATEWAY_BASE = 'http://localhost:18789';

let cachedToken: string | null = null;

async function getToken(): Promise<string> {
	if (cachedToken) return cachedToken;

	// Try environment variable first
	if (env.OPENCLAW_TOKEN) {
		cachedToken = env.OPENCLAW_TOKEN;
		return cachedToken;
	}

	// Fall back to config file
	try {
		const configPath = join(homedir(), '.openclaw', 'openclaw.json');
		const raw = await readFile(configPath, 'utf-8');
		const config = JSON.parse(raw);
		const token = config?.gateway?.auth?.token as string | undefined;
		if (token) {
			cachedToken = token;
			return token;
		}
	} catch {
		// Config file not found or invalid
	}

	throw new Error('No OpenClaw token found. Set OPENCLAW_TOKEN or configure ~/.openclaw/openclaw.json');
}

export async function openclawFetch(path: string, init?: RequestInit): Promise<Response> {
	const token = await getToken();
	const url = `${GATEWAY_BASE}${path}`;

	return fetch(url, {
		...init,
		headers: {
			'Authorization': `Bearer ${token}`,
			'Content-Type': 'application/json',
			...init?.headers
		}
	});
}
