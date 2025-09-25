# CodeMate

AI coding companion with terminal interface and WebSocket communication.

## Structure

```
code-mate/
├── client/          # Terminal UI (Ink + React)
├── server/          # WebSocket server (Hono)
└── shared/          # Shared types & utilities
```

## Commands

```bash
# Root
pnpm install        # Always use pnpm to insall any libs
pnpm dev            # Start all services
pnpm build          # Build all services
pnpm lint           # Lint all services
pnpm lint:fix       # Lint:fix all services

# Client
pnpm run dev        # Run terminal app

# Server
pnpm run dev        # Start WebSocket server
```

## Tech Stack

- **Frontend**: Ink, React, TypeScript
- **Backend**: Hono, WebSockets, TypeScript
- **Tooling**: PNPM workspace, ESLint (antfu)