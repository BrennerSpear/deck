import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';

interface GlobalSkill {
	name: string;
	description: string;
}

const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

function normalizeQuotedValue(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1).trim();
	}
	return trimmed;
}

function extractDescription(markdown: string): string {
	const frontmatterMatch = markdown.match(FRONTMATTER_RE);
	if (frontmatterMatch) {
		const descriptionMatch = frontmatterMatch[1].match(/^\s*description:\s*(.+)\s*$/im);
		if (descriptionMatch) {
			return normalizeQuotedValue(descriptionMatch[1]);
		}
	}

	const body = markdown.replace(FRONTMATTER_RE, '');
	const lines = body.split(/\r?\n/);
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith('#')) continue;
		return trimmed;
	}

	return 'No description available';
}

async function loadSkillDescription(skillFilePath: string): Promise<string> {
	try {
		const markdown = await readFile(skillFilePath, 'utf8');
		return extractDescription(markdown);
	} catch {
		return 'No description available';
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const explicitPath = url.searchParams.get('path');
	const openclawHome =
		process.env.OPENCLAW_HOME?.trim() ||
		(process.env.HOME ? path.join(process.env.HOME, '.openclaw') : '');
	const skillsPath = explicitPath
		? path.resolve(explicitPath)
		: path.join(openclawHome, 'workspace', 'skills');
	if (!existsSync(skillsPath)) {
		return json({ skills: [] });
	}

	try {
		const dirents = await readdir(skillsPath, { withFileTypes: true });
		const sorted = dirents
			.filter((dirent) => !dirent.name.startsWith('.'))
			.sort((a, b) => a.name.localeCompare(b.name));

		const skills: GlobalSkill[] = [];

		for (const dirent of sorted) {
			const entryPath = path.join(skillsPath, dirent.name);
			let isDir = dirent.isDirectory();

			// Support symlinked skill directories.
			if (!isDir && dirent.isSymbolicLink()) {
				try {
					const target = await stat(entryPath);
					isDir = target.isDirectory();
				} catch {
					isDir = false;
				}
			}

			if (!isDir) continue;

			const skillFilePath = path.join(entryPath, 'SKILL.md');
			if (!existsSync(skillFilePath)) continue;

			skills.push({
				name: dirent.name,
				description: await loadSkillDescription(skillFilePath)
			});
		}

		return json({ skills });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to load global skills';
		return json({ error: message }, { status: 500 });
	}
};
