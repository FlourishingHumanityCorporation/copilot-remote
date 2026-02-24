# ⚡ Copilot Remote

Control GitHub Copilot CLI from your phone. Start sessions, send prompts, and watch Copilot work — all from a mobile-friendly chat interface over your local network.

<p align="center">
  <img src="docs/architecture.png" alt="Architecture diagram" width="600" />
</p>

## How It Works

```
┌──────────────┐         local WiFi          ┌──────────────────────┐
│  📱 Phone    │ ◄── WebSocket + REST ──►    │  💻 Laptop           │
│  (PWA)       │      :5173 → :3001          │  (Node.js server)    │
│              │                              │                      │
│  Chat UI     │                              │  Spawns copilot CLI  │
│  Session list│                              │  via node-pty        │
│  New session │                              │  Reads ~/.copilot/   │
└──────────────┘                              └──────────────────────┘
```

The **server** runs on your laptop alongside your Copilot CLI installations. It spawns and manages Copilot processes using pseudo-terminals (`node-pty`), parses their output into chat messages, and streams everything over WebSocket.

The **web app** is a React PWA built with [GitHub Primer](https://primer.style/react/) that you open on your phone. It connects to the server over your local network, shows your sessions in a sidebar, and lets you interact through a familiar chat interface.

## Features

- **📋 Session Browser** — Lists all Copilot CLI sessions: currently running (managed by the server) and historical (discovered from `~/.copilot/session-state/`)
- **🚀 Start Sessions** — Launch new Copilot sessions with a prompt, working directory, or resume an existing session by ID
- **💬 Chat Interface** — Send messages and see Copilot's responses as formatted chat bubbles with markdown rendering
- **🔄 Resume Sessions** — Pick up where you left off with `--resume <sessionId>`
- **⚡ Real-time Streaming** — WebSocket connection streams Copilot output as it happens
- **📱 Installable PWA** — Add to home screen on iOS/Android, runs in standalone mode
- **🔒 Token Auth** — Server generates a random 256-bit token on first run; all API/WebSocket calls require it
- **🔁 Auto-reconnect** — WebSocket reconnects automatically with 3-second backoff

## Prerequisites

- **Node.js 18+** and **npm 9+**
- **GitHub Copilot CLI** installed and authenticated (`copilot` command available in PATH)
- Laptop and phone on the **same WiFi network**

## Installation

```bash
git clone https://github.com/clubanderson/copilot-remote.git
cd copilot-remote
npm install
```

## Usage

### 1. Start the server

```bash
npm run dev
```

This launches both the **API server** (port 3001) and the **Vite dev server** (port 5173) concurrently.

On first run, you'll see:

```
🚀 Copilot Remote server running on http://0.0.0.0:3001

🔑 Auth token: a1b2c3d4e5f6...

   Use this token to connect from your phone.
   It's saved in ~/.copilot-remote/auth-token
```

### 2. Open on your phone

Find your laptop's local IP:

```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```

Open `http://<laptop-ip>:5173` on your phone's browser.

### 3. Connect

On first visit, you'll see a setup screen. Enter:
- **Auth Token** — the token displayed when the server started
- **Server URL** (optional) — only needed if not using the Vite proxy (e.g., `http://192.168.1.100:3001`)

### 4. Start a session

Tap **New** in the sidebar, enter a prompt like `"Fix the failing tests in src/"`, optionally set a working directory, and hit **Create Session**. Copilot starts working and you'll see its output stream in as chat messages.

### 5. Install as PWA

On your phone's browser, tap **Share → Add to Home Screen** (iOS) or the install banner (Android/Chrome). The app runs in standalone mode without browser chrome.

## Project Structure

```
copilot-remote/
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── index.ts            # Express + WebSocket server, REST API routes
│   │   ├── session-manager.ts  # PTY lifecycle: spawn, track, stream, kill
│   │   ├── session-store.ts    # Reads ~/.copilot/session-state/ for history
│   │   ├── auth.ts             # Token generation, middleware, WS validation
│   │   └── types.ts            # Shared TypeScript interfaces
│   ├── package.json
│   └── tsconfig.json
├── web/                        # React PWA frontend
│   ├── src/
│   │   ├── App.tsx             # Root: routing, state, WS handler
│   │   ├── main.tsx            # Entry: Primer ThemeProvider setup
│   │   ├── components/
│   │   │   ├── SessionList.tsx     # Sidebar session list with status badges
│   │   │   ├── ChatView.tsx        # Chat area: messages + input bar
│   │   │   ├── MessageBubble.tsx   # Individual message with markdown
│   │   │   ├── NewSessionDialog.tsx# Create/resume session form
│   │   │   └── ConnectionStatus.tsx# Green/red dot indicator
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts     # WS connection with auto-reconnect
│   │   │   └── useSessions.ts      # Session list polling
│   │   └── lib/
│   │       └── api.ts              # REST client (fetch wrapper)
│   ├── vite.config.ts          # Vite + PWA + proxy config
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
├── package.json                # Root workspace (npm workspaces)
└── README.md
```

## API Reference

All endpoints (except health) require `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server status (no auth required) |
| `GET` | `/api/sessions` | List all sessions (running + historical) |
| `POST` | `/api/sessions` | Start new session `{ prompt?, cwd?, resume? }` |
| `GET` | `/api/sessions/:id` | Session details + last 100 messages |
| `DELETE` | `/api/sessions/:id` | Kill a running session |
| `POST` | `/api/sessions/:id/send` | Send message `{ text }` to running session |

### WebSocket

Connect to `/ws?token=<token>` for real-time streaming.

**Client → Server:**
```json
{ "type": "subscribe", "sessionId": "..." }
{ "type": "input", "sessionId": "...", "text": "..." }
```

**Server → Client:**
```json
{ "type": "output", "sessionId": "...", "data": "...", "timestamp": "..." }
{ "type": "message", "sessionId": "...", "message": { "role": "copilot", "content": "..." } }
{ "type": "status", "sessionId": "...", "status": "running" }
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |

Auth token is stored in `~/.copilot-remote/auth-token` (created automatically, `chmod 600`).

Session history is read from `~/.copilot/session-state/` (Copilot CLI's native session storage).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Server runtime | Node.js + TypeScript |
| HTTP framework | Express 5 |
| WebSocket | ws |
| Terminal emulation | node-pty |
| Session parsing | yaml (for workspace.yaml) |
| Frontend framework | React 18 |
| UI components | @primer/react (GitHub's design system) |
| Icons | @primer/octicons-react |
| Markdown | react-markdown |
| Build tool | Vite 6 |
| PWA | vite-plugin-pwa |

## Roadmap

- [ ] Push notifications when sessions need input or complete
- [ ] Tunnel support (ngrok / Cloudflare) for remote access beyond local WiFi
- [ ] Quick actions: approve tool use, cancel operations
- [ ] File browser for session artifacts
- [ ] Multi-session split view
- [ ] Dark/light theme toggle

## License

Apache-2.0
