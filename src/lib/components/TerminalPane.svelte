<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		paneId: string;
		width: number;
		height: number;
	}

	let { paneId, width, height }: Props = $props();

	let terminalContainer: HTMLDivElement;
	let terminal: any;
	let fitAddon: any;
	let pollInterval: ReturnType<typeof setInterval> | undefined;
	let lastContent = '';
	let isFocused = $state(false);

	async function fetchPaneContent() {
		try {
			const response = await fetch(`/api/tmux/capture?pane=${encodeURIComponent(paneId)}`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? `Failed to capture pane ${paneId}`);
			}
			const data = await response.json();

			if (data.content !== lastContent) {
				// Trim trailing empty lines but preserve ANSI codes
				const trimmedContent = data.content.replace(/\n+$/, '');
				lastContent = data.content;
				terminal.clear();
				terminal.write(trimmedContent);
				// Scroll to bottom to show the latest content
				terminal.scrollToBottom();
			}
		} catch (error) {
			console.error('Failed to fetch pane content:', error);
		}
	}

	async function sendKeys(keys: string) {
		try {
			const response = await fetch('/api/tmux/send-keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ paneId, keys })
			});

			if (!response.ok) {
				console.error('Failed to send keys:', await response.text());
			}
		} catch (error) {
			console.error('Failed to send keys:', error);
		}
	}

	onMount(() => {
		let resizeObserver: ResizeObserver | null = null;
		let disposed = false;

		async function initializeTerminal() {
			const { Terminal } = await import('@xterm/xterm');
			const { FitAddon } = await import('@xterm/addon-fit');
			await import('@xterm/xterm/css/xterm.css');

			if (disposed) return;

			terminal = new Terminal({
				theme: {
					background: '#09090b',
					foreground: '#f4f4f5',
					cursor: '#a78bfa',
					black: '#27272a',
					red: '#f87171',
					green: '#4ade80',
					yellow: '#facc15',
					blue: '#60a5fa',
					magenta: '#c084fc',
					cyan: '#22d3ee',
					white: '#e4e4e7',
					brightBlack: '#52525b',
					brightRed: '#fca5a5',
					brightGreen: '#86efac',
					brightYellow: '#fde047',
					brightBlue: '#93c5fd',
					brightMagenta: '#d8b4fe',
					brightCyan: '#67e8f9',
					brightWhite: '#fafafa'
				},
				fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
				fontSize: 13,
				cursorBlink: false,
				disableStdin: false,
				cursorStyle: 'block',
				convertEol: true,
				rows: Math.floor(height / 16) || 24,
				cols: Math.floor(width / 9) || 80,
				scrollback: 1000
			});

			fitAddon = new FitAddon();
			terminal.loadAddon(fitAddon);

			terminal.open(terminalContainer);
			fitAddon.fit();

			// Enable input handling
			terminal.onData((data: string) => {
				void sendKeys(data);
			});

			// Track focus via textarea element
			const textarea = terminal.textarea;
			if (textarea) {
				textarea.addEventListener('focus', () => {
					isFocused = true;
				});
				textarea.addEventListener('blur', () => {
					isFocused = false;
				});
			}

			await fetchPaneContent();

			pollInterval = setInterval(fetchPaneContent, 500);
			resizeObserver = new ResizeObserver(() => {
				fitAddon.fit();
			});
			resizeObserver.observe(terminalContainer);
		}

		void initializeTerminal();

		return () => {
			disposed = true;
			if (pollInterval) clearInterval(pollInterval);
			resizeObserver?.disconnect();
			terminal?.dispose();
		};
	});
</script>

<div 
	bind:this={terminalContainer} 
	class="w-full h-64 bg-zinc-950 relative"
	class:ring-2={isFocused}
	class:ring-violet-400={isFocused}
	class:ring-opacity-50={isFocused}
></div>

<style>
	:global(.xterm) {
		padding: 8px;
	}

	:global(.xterm-viewport) {
		overflow-y: hidden !important;
	}

	/* Completely hide xterm cursor - it doesn't match tmux cursor position.
	   Users can still type and it goes to the correct place in the real tmux session. */
	:global(.xterm-cursor),
	:global(.xterm-cursor-block),
	:global(.xterm-cursor-bar),
	:global(.xterm-cursor-underline) {
		display: none !important;
	}
</style>
