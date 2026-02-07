/**
 * File viewer store — manages open files, active file, and file content caching.
 */

import type { FilePosition } from '$lib/types';
import * as tauri from '$lib/stores/tauri';

// ── State ──────────────────────────────────────────────────────────────────

let openFiles = $state<string[]>([]);
let activeFile = $state<string | null>(null);
let filePosition = $state<FilePosition>('right');
let filePaneWidth = $state(480);
let filePaneHeight = $state(300);
let fileContents = $state<Record<string, string>>({});
let loadingFile = $state<string | null>(null);

// ── Actions ────────────────────────────────────────────────────────────────

async function openFile(path: string) {
	if (!openFiles.includes(path)) {
		openFiles = [...openFiles, path];
	}
	activeFile = path;

	// Load content if not cached
	if (!fileContents[path]) {
		loadingFile = path;
		try {
			const content = await tauri.readFile(path);
			fileContents = { ...fileContents, [path]: content };
		} catch (e) {
			fileContents = { ...fileContents, [path]: `*Error loading file: ${e}*` };
		} finally {
			loadingFile = null;
		}
	}
}

function closeFile(path: string) {
	openFiles = openFiles.filter(f => f !== path);
	if (activeFile === path) {
		activeFile = openFiles[openFiles.length - 1] ?? null;
	}
	// Clear content cache for closed file
	const { [path]: _, ...rest } = fileContents;
	fileContents = rest;
}

function closeAllFiles() {
	openFiles = [];
	activeFile = null;
	fileContents = {};
}

function setPosition(pos: FilePosition) {
	filePosition = pos;
}

function setWidth(w: number) {
	filePaneWidth = w;
}

function setHeight(h: number) {
	filePaneHeight = h;
}

// Invalidate cache for a path (e.g., after file change detected)
function invalidateCache(path: string) {
	if (fileContents[path]) {
		const { [path]: _, ...rest } = fileContents;
		fileContents = rest;
		// Re-load if it's the active file
		if (activeFile === path) {
			openFile(path);
		}
	}
}

// ── Export ──────────────────────────────────────────────────────────────────

export const fileStore = {
	get openFiles() { return openFiles; },
	get activeFile() { return activeFile; },
	get filePosition() { return filePosition; },
	get filePaneWidth() { return filePaneWidth; },
	get filePaneHeight() { return filePaneHeight; },
	get showFilePane() { return openFiles.length > 0; },
	get loadingFile() { return loadingFile; },

	getContent(path: string): string | null {
		return fileContents[path] ?? null;
	},

	openFile,
	closeFile,
	closeAllFiles,
	setPosition,
	setWidth,
	setHeight,
	invalidateCache,
};
