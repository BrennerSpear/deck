// ── Project Types ──────────────────────────────────────────────────────────

export interface Project {
	id: string;
	name: string;
	path: string;
	icon: string;
}

// ── File Tree Types ────────────────────────────────────────────────────────

export interface DirEntry {
	name: string;
	path: string;
	is_dir: boolean;
	is_file: boolean;
	children?: DirEntry[];
	size?: number;
}

// ── Playbook Tree Types (UI representation of the file tree) ───────────────

export interface PlaybookItem {
	name: string;
	path: string;
	isFolder: boolean;
	desc?: string;
	children?: PlaybookItem[];
	fileCount?: number;
}

// ── Conversation Types ─────────────────────────────────────────────────────

export interface ToolCall {
	type: string;
	command?: string;
	file?: string;
	status: 'running' | 'done';
}

export interface Message {
	role: 'user' | 'assistant';
	content: string;
	toolCalls?: ToolCall[];
}

export interface Conversation {
	id: string;
	projectId: string;
	title: string;
	status: 'working' | 'waiting' | 'done';
	preview: string;
	waitingFor: string | null;
	messages: Message[];
}

// ── Skill Types ────────────────────────────────────────────────────────────

export interface Skill {
	name: string;
	desc: string;
	icon: string;
	calls: string[];
}

// ── Model Types ────────────────────────────────────────────────────────────

export interface Model {
	id: string;
	name: string;
	provider: string;
	contextWindow: number;
}

// ── File Position ──────────────────────────────────────────────────────────

export type FilePosition = 'left' | 'right' | 'above';

// ── Tmux Mission Control Types ────────────────────────────────────────────

export interface TmuxSession {
	name: string;
	agent: 'claude' | 'codex';
	repo: string;
	systemPrompt?: string;
	topic?: string;
	created: string;
	lastUsed: string;
	status: 'running' | 'idle' | 'done' | 'killed';
	currentCommand?: string;
	activePaneId?: string;
	lastLine?: string;
	activityState?: 'running' | 'waiting';
}

export interface TmuxPane {
	id: string;
	width: number;
	height: number;
	currentCommand: string;
	currentPath?: string;
}

export interface TmuxSessionsState {
	sessions: Record<string, TmuxSession>;
}

export interface AgentEvent {
	timestamp: string;
	type: 'teammate-idle' | 'task-completed';
	agent?: string;
	message: string;
	repo?: string;
}

export interface TmuxStreamMessage {
	type: 'pane-update' | 'session-update' | 'agent-event' | 'error';
	sessionName?: string;
	paneId?: string;
	content?: string;
	sessions?: Record<string, TmuxSession>;
	event?: AgentEvent;
	error?: string;
}

// ── Dashboard Types ──────────────────────────────────────────────────────

export interface CronJob {
	name: string;
	enabled: boolean;
	schedule: string;
	lastRun?: string;
	lastStatus?: 'ok' | 'error' | 'skip';
	consecutiveErrors: number;
}

export interface SubAgent {
	sessionKey: string;
	model: string;
	tokensUsed: number;
	duration: number;
	status: string;
	kind?: string;
}
