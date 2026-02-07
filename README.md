# Deck

Agent UI Command Center — a desktop app for managing AI agent conversations across projects.

Built with **SvelteKit 5**, **Svelte 5** (runes), **Tailwind CSS v4**, and **Tauri v2**.

## Features

- **Project sidebar** — add real project folders from disk, conversation status dots
- **Playbook file tree** — browse AGENTS.md, skills/, hooks/, context/ files
- **Changes section** — view file diffs with addition/deletion counts
- **Skills section** — hover descriptions, global/repo grouping, skill chain composition
- **File viewer** — view and render markdown files with syntax highlighting, repositionable pane
- **Conversation threads** — manage working/waiting/done conversations with slide animations
- **Axel avatar** — AI assistant with custom avatar
- **Model selector** — choose between Claude, GPT-4o, Gemini models
- **Violet-400 accent theme** — dark zinc theme with violet accent colors
- **Terminal-like input** — with inline skill bubbles and backspace-to-clear

## Architecture

```
src/                          # SvelteKit frontend
├── lib/
│   ├── components/           # Svelte 5 components
│   │   ├── ProjectSidebar    # Left sidebar with project list
│   │   ├── ProjectPanel      # Playbook tree + changes + skills
│   │   ├── ChatArea          # Conversation threads + input
│   │   ├── FilePane          # File viewer with tabs
│   │   └── PlaybookTree      # Recursive file tree component
│   ├── stores/               # Svelte 5 rune stores
│   │   ├── projects.svelte   # Project & conversation state
│   │   ├── files.svelte      # File viewer state
│   │   └── tauri             # Tauri command bridge (with browser fallback)
│   └── types/                # TypeScript types
src-tauri/                    # Tauri v2 Rust backend
├── src/
│   ├── lib.rs                # App setup + plugin registration
│   ├── main.rs               # Entry point
│   └── commands.rs           # Filesystem commands (list_dir, read_file, watch, config)
└── tauri.conf.json           # Tauri configuration
```

## Development

### Prerequisites

- **Node.js** ≥ 18
- **Rust** (install via [rustup](https://rustup.rs))
- **System libraries** (Linux):
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev libssl-dev
  ```
- **System libraries** (macOS): Xcode Command Line Tools

### Setup

```bash
npm install
```

### Frontend only (browser dev)

```bash
npm run dev
```

Runs in browser with mock data fallback — no Tauri needed.

### Desktop app (Tauri dev)

```bash
npm run tauri:dev
```

Opens the native desktop window with real filesystem access.

### Build for production

```bash
npm run tauri:build
```

Creates platform-specific installers in `src-tauri/target/release/bundle/`.

## How It Works

- **In Tauri**: Rust commands handle filesystem access (list_dir, read_file, watch_dir). Projects config persists in Tauri's app data directory.
- **In browser**: Falls back to mock data for development. The Tauri bridge (`src/lib/stores/tauri.ts`) detects the runtime and switches automatically.

## Stack

- SvelteKit 2 + Svelte 5 (runes)
- Tailwind CSS v4
- Tauri v2
- TypeScript
- marked (markdown rendering)

## License

MIT
