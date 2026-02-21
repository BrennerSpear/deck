import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const GUILD_ID = '1473464051370819721';

interface ChannelResult {
	channelId: string;
	name: string;
	type: number;
	parentId: string | null;
	parentName: string | null;
	systemPrompt: string | null;
}

export const GET: RequestHandler = async () => {
	try {
		const home = homedir();
		const openclawPath = join(home, '.openclaw/openclaw.json');
		const openclawRaw = await readFile(openclawPath, 'utf-8');
		const openclaw = JSON.parse(openclawRaw);

		const guildConfig = openclaw?.channels?.discord?.guilds?.[GUILD_ID] ?? {};
		const channelConfigs: Record<string, { allow?: boolean; systemPrompt?: string }> =
			guildConfig.channels ?? {};

		// Build a map of all Discord channels from the guild via the bot token
		// For now, read from config — channels that have `allow: true` are configured
		const results: ChannelResult[] = [];

		for (const [channelId, config] of Object.entries(channelConfigs)) {
			if (!config.allow) continue;

			results.push({
				channelId,
				name: channelId, // placeholder — will be enriched below
				type: 0,
				parentId: null,
				parentName: null,
				systemPrompt: config.systemPrompt ?? null
			});
		}

		// Enrich with Discord API data if bot token is available
		const botToken = openclaw?.channels?.discord?.token;
		if (botToken) {
			try {
				const res = await fetch(
					`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`,
					{ headers: { Authorization: `Bot ${botToken}` } }
				);
				if (res.ok) {
					const apiChannels: Array<{
						id: string;
						name: string;
						type: number;
						parent_id: string | null;
					}> = await res.json();

					const channelMap = new Map(apiChannels.map((c) => [c.id, c]));

					// Update results with real names and types
					for (const result of results) {
						const apiChannel = channelMap.get(result.channelId);
						if (apiChannel) {
							result.name = apiChannel.name;
							result.type = apiChannel.type;
							result.parentId = apiChannel.parent_id;

							if (apiChannel.parent_id) {
								const parent = channelMap.get(apiChannel.parent_id);
								result.parentName = parent?.name ?? null;
							}
						}
					}

					// Filter out category channels (type 4)
					const filtered = results.filter((r) => r.type !== 4);

					// Sort: channels with system prompts first, then alphabetically
					filtered.sort((a, b) => {
						if (a.systemPrompt && !b.systemPrompt) return -1;
						if (!a.systemPrompt && b.systemPrompt) return 1;
						return a.name.localeCompare(b.name);
					});

					return json(filtered);
				}
			} catch {
				// Fall through to return unenriched results
			}
		}

		// Sort: channels with system prompts first, then by ID
		results.sort((a, b) => {
			if (a.systemPrompt && !b.systemPrompt) return -1;
			if (!a.systemPrompt && b.systemPrompt) return 1;
			return a.channelId.localeCompare(b.channelId);
		});

		return json(results);
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Failed to fetch discord channels';
		return json({ error: message }, { status: 502 });
	}
};
