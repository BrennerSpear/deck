import type { TmuxSession } from '$lib/types';

export function normalizePath(input: string): string {
	return input.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function getFolderName(input: string): string {
	const normalized = normalizePath(input);
	const parts = normalized.split('/').filter(Boolean);
	return parts[parts.length - 1] ?? normalized;
}

export function sessionBelongsToProject(session: TmuxSession, projectPath: string): boolean {
	const normalizedProjectPath = normalizePath(projectPath);
	const normalizedRepoPath = normalizePath(session.repo || '');

	if (normalizedRepoPath === normalizedProjectPath) return true;
	if (normalizedRepoPath.startsWith(`${normalizedProjectPath}/`)) return true;

	return getFolderName(normalizedRepoPath) === getFolderName(normalizedProjectPath);
}

export function getSessionActivityLabel(session: TmuxSession): 'running' | 'waiting' {
	if (session.activityState) return session.activityState;
	return session.status === 'running' ? 'running' : 'waiting';
}
