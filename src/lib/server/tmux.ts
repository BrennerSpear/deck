import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SHELL_COMMANDS = new Set(['zsh', 'bash', 'sh', 'fish', 'nu', 'tmux']);

export interface LiveTmuxSession {
	name: string;
	createdEpoch: number | null;
	activityEpoch: number | null;
	attachedClients: number;
}

export interface LiveTmuxPane {
	sessionName: string;
	id: string;
	width: number;
	height: number;
	currentCommand: string;
	currentPath: string;
	isActive: boolean;
}

interface ExecErrorLike extends Error {
	code?: number | string;
	stderr?: string;
	errno?: string;
}

async function runTmux(args: string[]): Promise<string> {
	const { stdout } = await execFileAsync('tmux', args, { maxBuffer: 10 * 1024 * 1024 });
	return stdout ?? '';
}

function toNumber(value: string): number | null {
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : null;
}

function parseLines(output: string): string[] {
	if (!output.trim()) return [];
	return output
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}

export function isTmuxNotInstalledError(error: unknown): boolean {
	const err = error as ExecErrorLike;
	return err.code === 'ENOENT' || err.errno === 'ENOENT' || /ENOENT/i.test(err.message);
}

export function isTmuxServerNotRunningError(error: unknown): boolean {
	const err = error as ExecErrorLike;
	const stderr = (err.stderr ?? '').toLowerCase();
	const message = (err.message ?? '').toLowerCase();
	return (
		stderr.includes('no server running') ||
		stderr.includes('failed to connect to server') ||
		message.includes('no server running') ||
		message.includes('failed to connect to server')
	);
}

export function isTmuxTargetMissingError(error: unknown): boolean {
	const err = error as ExecErrorLike;
	const stderr = (err.stderr ?? '').toLowerCase();
	return stderr.includes("can't find pane") || stderr.includes("can't find session");
}

export function formatTmuxError(error: unknown): string {
	if (error instanceof Error) return error.message;
	return 'Unknown tmux error';
}

export async function listTmuxSessions(): Promise<LiveTmuxSession[]> {
	const format = '#{session_name}\t#{session_created}\t#{session_activity}\t#{session_attached}';
	const output = await runTmux(['list-sessions', '-F', format]);
	const lines = parseLines(output);
	const sessions: LiveTmuxSession[] = [];

	for (const line of lines) {
		const [name, createdRaw, activityRaw, attachedRaw] = line.split('\t');
		if (!name) continue;
		sessions.push({
			name,
			createdEpoch: toNumber(createdRaw),
			activityEpoch: toNumber(activityRaw),
			attachedClients: toNumber(attachedRaw) ?? 0
		});
	}

	return sessions;
}

export async function listTmuxPanes(sessionName?: string): Promise<LiveTmuxPane[]> {
	const format =
		'#{session_name}\t#{pane_id}\t#{pane_width}\t#{pane_height}\t#{pane_current_command}\t#{pane_current_path}\t#{pane_active}';
	const args = ['list-panes', '-F', format];
	if (sessionName) {
		args.push('-t', sessionName);
	} else {
		args.push('-a');
	}
	const output = await runTmux(args);
	const lines = parseLines(output);
	const panes: LiveTmuxPane[] = [];

	for (const line of lines) {
		const [name, id, widthRaw, heightRaw, currentCommand, currentPath, activeRaw] = line.split('\t');
		if (!name || !id) continue;
		panes.push({
			sessionName: name,
			id,
			width: toNumber(widthRaw) ?? 0,
			height: toNumber(heightRaw) ?? 0,
			currentCommand: currentCommand ?? '',
			currentPath: currentPath ?? '',
			isActive: activeRaw === '1'
		});
	}

	return panes;
}

export async function captureTmuxPane(paneId: string): Promise<string> {
	return runTmux(['capture-pane', '-p', '-e', '-S', '-200', '-E', '-', '-t', paneId]);
}

export async function captureTmuxPaneTail(paneId: string, lineCount: number = 40): Promise<string> {
	const start = `-${Math.max(1, lineCount)}`;
	return runTmux(['capture-pane', '-p', '-e', '-S', start, '-E', '-', '-t', paneId]);
}

export async function killTmuxSession(sessionName: string): Promise<void> {
	await runTmux(['kill-session', '-t', sessionName]);
}

export function epochToIso(epoch: number | null): string {
	if (epoch === null) return new Date().toISOString();
	return new Date(epoch * 1000).toISOString();
}

export function inferAgent(name: string, command: string | undefined): 'claude' | 'codex' {
	const source = `${name} ${command ?? ''}`.toLowerCase();
	return source.includes('codex') ? 'codex' : 'claude';
}

export function inferStatus(activityEpoch: number | null, attachedClients: number, command: string | undefined) {
	if (attachedClients > 0) return 'running' as const;
	if (command && !SHELL_COMMANDS.has(command)) return 'running' as const;

	if (activityEpoch === null) return 'idle' as const;
	const ageMs = Date.now() - activityEpoch * 1000;
	if (ageMs > 10 * 60 * 1000) return 'idle' as const;
	return 'running' as const;
}

export function inferActivityState(command: string | undefined): 'running' | 'waiting' {
	if (command && !SHELL_COMMANDS.has(command)) {
		return 'running';
	}
	return 'waiting';
}

function stripAnsi(input: string): string {
	return input.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '');
}

export function extractLastLogLine(content: string): string {
	const lines = content
		.split('\n')
		.map((line) => stripAnsi(line).trim())
		.filter((line) => line.length > 0);

	return lines[lines.length - 1] ?? '';
}
