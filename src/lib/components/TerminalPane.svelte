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

	async function fetchPaneContent() {
		try {
			const response = await fetch(`/api/tmux/capture?pane=${encodeURIComponent(paneId)}`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload.error ?? `Failed to capture pane ${paneId}`);
			}
			const data = await response.json();

			if (data.content !== lastContent) {
				lastContent = data.content;
				terminal.clear();
				terminal.write(data.content);
			}
		} catch (error) {
			console.error('Failed to fetch pane content:', error);
		}
	}

	onMount(() => {
		let resizeObserver: ResizeObserver | null = null;
		let disposed = false;

		async function initializeTerminal() {
			// Dynamic imports — xterm is browser-only
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
				disableStdin: true,
				convertEol: true,
				rows: Math.floor(height / 17) || 24,
				cols: Math.floor(width / 8) || 80
			});

			fitAddon = new FitAddon();
			terminal.loadAddon(fitAddon);

			terminal.open(terminalContainer);
			fitAddon.fit();
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

<div bind:this={terminalContainer} class="w-full h-64 bg-zinc-950"></div>

<style>
	:global(.xterm) {
		padding: 8px;
	}

	:global(.xterm-viewport) {
		overflow-y: hidden !important;
	}
</style>
