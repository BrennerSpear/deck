# Agent Mission Control

A real-time tmux session monitoring dashboard for coding agents.

## Features

- **Session Grid View**: Displays all active tmux sessions with status indicators
- **Real-time Terminal Streaming**: Live pane output with xterm.js rendering
- **Agent Team Events**: Side panel showing teammate idle/task completed notifications
- **Session Management**: Kill sessions directly from the UI
- **Status Indicators**: Visual status (running/idle/done/killed) with color coding

## Usage

1. Navigate to `/mission-control` in the app
2. View all active local tmux sessions from the running tmux server
3. Click a session to expand and view all panes
4. Monitor agent team events from `/tmp/openclaw-tmux/agent-team-events.log`
5. Kill sessions as needed

## Architecture

### Backend (API Routes)

- `GET /api/tmux/sessions` - List all live tmux sessions (optionally enriched by state metadata)
- `DELETE /api/tmux/sessions?name=<session>` - Kill a session
- `GET /api/tmux/panes?session=<session>` - Get panes for a session
- `GET /api/tmux/capture?pane=<pane_id>` - Capture pane content
- `GET /api/tmux/events?since=<timestamp>` - Get team events

### Frontend

- `/mission-control` - Main dashboard page
- `TerminalPane.svelte` - xterm.js terminal component with polling
- Auto-refresh: Sessions (2s), Events (1s), Pane content (500ms)

## Data Sources

- Sessions/panes/capture are read from live local tmux commands (`list-sessions`, `list-panes`, `capture-pane`)
- If present, `~/.openclaw/workspace/state/tmux-sessions.json` is used only to enrich session cards with metadata (topic/system prompt/repo)
- Team events still read from `/tmp/openclaw-tmux/agent-team-events.log` (with mock fallback only for that feed)

## Dependencies

- `@xterm/xterm` - Terminal emulator
- `@xterm/addon-fit` - Terminal auto-sizing

## Theme

- Dark mode (zinc + violet accent)
- ANSI color support in terminals
- Status colors: green (running), yellow (idle), blue (done), red (killed)
