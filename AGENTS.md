# AGENTS.md

This file provides guidance to AI agents working with code in this repository.

## Project Overview

Classworks is a **pnpm monorepo** containing three apps and a shared package for the Classworks (作业板) classroom homework-board platform. The UI is in Chinese.

| Package                 | Path              | Stack                          | Description                                           |
| ----------------------- | ----------------- | ------------------------------ | ----------------------------------------------------- |
| `@classworks/web`       | `apps/web`        | Vue 3 + Vuetify 3 PWA          | The homework board widget for classroom large screens |
| `@classworks/server`    | `apps/server`     | Express 5 + Prisma + Socket.IO | KV storage backend                                    |
| `@classworks/dashboard` | `apps/dashboard`  | Vue 3 + Tailwind 4             | Admin UI for the KV backend                           |
| `@classworks/shared`    | `packages/shared` | Pure JS (ESM)                  | Shared constants (headers, URLs)                      |

## Monorepo Layout

```
.
├── apps/
│   ├── web/            # 作业板 PWA (Vue + Vuetify)
│   ├── server/         # KV backend (Express + Prisma + Postgres + Socket.IO)
│   └── dashboard/      # Admin dashboard (Vue + Tailwind + reka-ui)
├── packages/
│   └── shared/         # Shared constants (@classworks/shared)
├── .github/
│   ├── actions/setup-pnpm/   # Reusable CI composite action
│   └── workflows/
├── package.json              # Root workspace scripts + shared dev deps
├── pnpm-workspace.yaml
├── eslint.config.js          # Shared ESLint flat config
├── .prettierrc.json
├── .editorconfig
└── .npmrc
```

## Commands

All commands run from the **repo root**.

```bash
pnpm install              # Install all workspace dependencies
pnpm run dev              # All apps in parallel (web :3031, server :3000, dashboard vite)
pnpm run build            # Build all apps
pnpm run lint             # ESLint with auto-fix
pnpm run format           # Prettier write
pnpm run format:check     # Prettier check

pnpm run dev:web          # Single app
pnpm run dev:server
pnpm run dev:dashboard
pnpm run build:web
pnpm run build:server     # prisma generate
pnpm run build:dashboard
```

### Per-app

- **apps/web**: `prebuild` (sound list), `build:store` (PWA store validation)
- **apps/server**: `start`, `dev` (nodemon), `build` (prisma generate), `get-token`. Requires `.env` with `DATABASE_URL`.
- **apps/dashboard**: `dev` / `build` / `preview`

## Shared Package (packages/shared)

Exports constants used across all three apps:

- `HEADER_APP_TOKEN`, `HEADER_SITE_KEY`, `HEADER_DEVICE_UUID`
- `DEFAULT_KV_SERVER`, `DEFAULT_LOCAL_SERVER`, `CLOUD_SERVERS`

All apps depend via `"@classworks/shared": "workspace:*"`.

## Architecture

- **Data layer** (web): `dataProvider.js` → `kvLocalProvider.js` (IndexedDB) or `kvServerProvider.js` (HTTP). Failover via `serverRotation.js`.
- **Real-time**: Client `socketClient.js` ↔ Server `socket.js` (Socket.IO rooms)
- **Settings** (web): `settings.js` — localStorage with typed definitions and migration

## Code Style

- 2-space indent, no TypeScript, ESM throughout
- `@/` alias → each app's `src/`
- ESLint 9 flat config + Prettier at root
- Mixed Composition API / Options API in Vue apps

## CI/CD

All workflows use `.github/actions/setup-pnpm` composite action.

| Workflow               | Trigger                           | Action                      |
| ---------------------- | --------------------------------- | --------------------------- |
| `ci.yml`               | push/PR to main                   | Lint, build web + dashboard |
| `deploy.yml`           | push to main (web/packages)       | Web → GitHub Pages          |
| `deploy-dashboard.yml` | push to main (dashboard/packages) | Dashboard build artifact    |
| `docker-publish.yml`   | push/tags (server/packages)       | Docker → GHCR + Docker Hub  |
| `store-pwa.yml`        | PR to main (web)                  | PWA store validation        |

## Notes

- Hoisted deps (`node-linker=hoisted` in `.npmrc`)
- Server native modules (`bcrypt`, `@prisma/client`): run `pnpm rebuild` if needed
- Docker builds use repo root as context (Dockerfile references `packages/shared`)
- Env files gitignored; copy `.env.example` / `.env.oauth.example` per app
