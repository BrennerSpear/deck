import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

export const GET: RequestHandler = async ({ url }) => {
	const skillName = url.searchParams.get('name');

	if (!skillName) {
		return json({ error: 'Skill name is required' }, { status: 400 });
	}

	// First check repo skills (current project)
	const repoSkillPath = path.join(process.cwd(), 'skills', skillName, 'SKILL.md');
	if (existsSync(repoSkillPath)) {
		try {
			const content = await readFile(repoSkillPath, 'utf-8');
			return json({ name: skillName, content, source: 'repo' });
		} catch {
			// Fall through to global skills
		}
	}

	// Check global skills
	const openclawHome =
		process.env.OPENCLAW_HOME?.trim() ||
		(process.env.HOME ? path.join(process.env.HOME, '.openclaw') : '');
	const globalSkillPath = path.join(openclawHome, 'workspace', 'skills', skillName, 'SKILL.md');

	if (existsSync(globalSkillPath)) {
		try {
			const content = await readFile(globalSkillPath, 'utf-8');
			return json({ name: skillName, content, source: 'global' });
		} catch {
			return json({ error: 'Failed to read skill file' }, { status: 500 });
		}
	}

	return json({ error: 'Skill not found' }, { status: 404 });
};
