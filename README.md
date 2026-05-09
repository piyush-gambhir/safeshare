# SafeShare

Decentralized peer-to-peer end-to-end encrypted file transfer over WebRTC.

This monorepo holds every surface of the project — two interchangeable signaling backends, a web client, and a desktop client.

## Apps

| Path | What | Stack |
|---|---|---|
| [`apps/web`](apps/web) | Web client | Next.js 15, shadcn/ui, WebTorrent |
| [`apps/electron`](apps/electron) | Desktop client | Electron, React, Vite |
| [`apps/backend-go`](apps/backend-go) | Production signaling backend | Go, Gin, sqlc, Postgres, Redis, RabbitMQ |
| [`apps/backend-fastify`](apps/backend-fastify) | Reference signaling backend | Fastify, Redis |

## Quickstart

Node apps live in a pnpm workspace; the Go backend is a sibling Go module.

```bash
pnpm install

# Web client (port 3000)
pnpm dev:web

# Desktop client
pnpm dev:electron

# Fastify backend (port 3001)
pnpm dev:backend-fastify

# Go backend
cd apps/backend-go && make up
```

Each app has its own README and `.env.example` describing its config.

## License

MIT
