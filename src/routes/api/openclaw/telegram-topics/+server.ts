import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GROUP_ID = '-1003856094222';

interface TopicResult {
	topicId: string;
	name: string;
	systemPrompt: string | null;
}

export const GET: RequestHandler = async () => {
	try {
		const home = homedir();
		const topicsPath = join(home, '.openclaw/workspace/state/telegram-topics.json');
		const openclawPath = join(home, '.openclaw/openclaw.json');

		const [topicsRaw, openclawRaw] = await Promise.all([
			readFile(topicsPath, 'utf-8'),
			readFile(openclawPath, 'utf-8')
		]);

		const topicsMap: Record<string, Record<string, string>> = JSON.parse(topicsRaw);
		const openclaw = JSON.parse(openclawRaw);

		const groupTopics = topicsMap[GROUP_ID] ?? {};
		const configuredTopics: Record<string, { systemPrompt?: string }> =
			openclaw?.channels?.telegram?.groups?.[GROUP_ID]?.topics ?? {};

		const results: TopicResult[] = [];

		for (const [topicId, name] of Object.entries(groupTopics)) {
			// Filter out archived topics
			if (name.startsWith('[ARCHIVED]')) continue;

			const systemPrompt = configuredTopics[topicId]?.systemPrompt ?? null;
			results.push({ topicId, name, systemPrompt });
		}

		// Sort: topics with system prompts first, then alphabetically by name
		results.sort((a, b) => {
			if (a.systemPrompt && !b.systemPrompt) return -1;
			if (!a.systemPrompt && b.systemPrompt) return 1;
			return a.name.localeCompare(b.name);
		});

		return json(results);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch telegram topics';
		return json({ error: message }, { status: 502 });
	}
};
