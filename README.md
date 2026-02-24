# Copilot Remote

A PWA for remotely starting, monitoring, and interacting with GitHub Copilot CLI sessions from your phone.

## Architecture

- **Server** (Node.js) — runs on your laptop, manages Copilot CLI processes via PTY, exposes WebSocket + REST API
- **Web** (React PWA) — mobile-first chat-style UI built with GitHub Primer, connects over local WiFi

## Quick Start

```bash
npm install
npm run dev        # starts both server and web dev server
```

Then open `http://<your-laptop-ip>:5173` on your phone.

## Features

- 📋 List all Copilot CLI sessions (running + historical)
- 🚀 Start new sessions with prompts, working directory, flags
- 💬 Chat-style interaction — send messages, see responses
- 🔄 Resume existing sessions
- 📱 Installable PWA — works offline (shell), auto-reconnects
- 🔒 Token-based auth — generated on first server start

## Tech Stack

| Component | Stack |
|-----------|-------|
| Server | Node.js, Express, ws, node-pty, TypeScript |
| Frontend | React, Vite, @primer/react, vite-plugin-pwa |
| Auth | Shared secret token |
| Network | Local WiFi (tunnel support planned) |

## License

Apache-2.0
