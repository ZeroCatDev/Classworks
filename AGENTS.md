# AGENTS.md

This file provides guidance to AI agents working with code in this repository.

## Project Overview

Classworks is a **pnpm monorepo** containing three apps for the Classworks (作业板) classroom homework-board platform. The UI is in Chinese.

| App | Package name | Path | Stack | Description |
| --- | --- | --- | --- | --- |
| **web** | `@classworks/web` | `apps/web` | Vue 3 + Vuetify 3 PWA | The homework board widget for classroom large screens |
| **server** | `@classworks/server` | `apps/server` | Express 5 + Prisma + Socket.IO | KV storage backend (formerly ClassworksKV) |
| **dashboard** | `@classworks/dashboard` | `apps/dashboard` | Vue 3 + Tailwind 4 | Admin UI for the KV backend (formerly ClassworksKVAdmin) |

## Monorepo Layout

```
.
├── apps/
│   ├── web/        # 作业板 PWA (Vue + Vuetify)
│   ├── server/     # KV backend (Express + Prisma + Postgres + Socket.IO)
│   └── dashboard/  # Admin dashboard (Vue + Tailwind + reka-ui)
├── package.json    # Root workspace package (scripts, shared dev deps)
├── pnpm-workspace.yaml
├── eslint.config.js     # Shared ESLint flat config (browser + Node contexts)
├── .prettierrc.json     # Shared Prettier config
├── .editorconfig
└── .npmrc
```

## Commands

All commands run from the **repo root** unless noted.

```bash
pnpm install              # Install all workspace dependencies

# Run all apps in parallel
pnpm run dev              # web (:3031) + server (:3000) + dashboard (vite default)
pnpm run build            # Build all apps
pnpm run preview          # Preview all built apps

# Run a single app
pnpm run dev:web         # apps/web dev server at localhost:3031 (network-accessible)
pnpm run dev:server      # apps/server dev server (nodemon)
pnpm run dev:dashboard   # apps/dashboard dev server
pnpm run build:web
pnpm run build:server    # (server has no build step; alias for start)
pnpm run build:dashboard

# Lint & format (shared config at root)
pnpm run lint            # ESLint with auto-fix across all apps
pnpm run format          # Prettier write across all apps
pnpm run format:check    # Prettier check

# App-scoped (equivalent)
pnpm --filter @classworks/web run dev
pnpm --filter @classworks/server run start
```

## Per-app commands

Each app keeps its own scripts in `apps/<app>/package.json`. Use `pnpm --filter` to run them from the root, or `cd apps/<app>` to run directly.

### apps/web (作业板)
- `pnpm run prebuild` — regenerate `src/utils/soundList.js` from `public/sounds/` (also runs before `build`)
- `pnpm run build:store` — full PWA build + validation
- `pnpm run pwa:validate` — validate PWA build output

### apps/server (KV backend)
- `pnpm run start` — start Express server (`node ./bin/www`, port 3000 by default)
- `pnpm run dev` — start with nodemon
- `pnpm run get-token` — CLI token helper
- Requires a `.env` with `DATABASE_URL` (PostgreSQL) and OAuth/JWT config; see `apps/server/.env.oauth.example`

### apps/dashboard (Admin)
- `pnpm run dev` / `build` / `preview` — standard Vite commands

## Tech Stack

### apps/web — 作业板 PWA
- **Framework**: Vue 3 (Composition API + Options API mixed), JavaScript (no TypeScript)
- **UI**: Vuetify 3 (Material Design 3), `@mdi/font` icons, SCSS
- **State**: Pinia 3
- **Routing**: Vue Router 4 with file-based routes (`unplugin-vue-router` + `vite-plugin-vue-layouts`)
- **Build**: Vite 5
- **Real-time**: Socket.IO client (singleton in `src/utils/socketClient.js`)
- **Data**: Pluggable KV provider abstraction (`src/utils/dataProvider.js`) with IndexedDB local and HTTP server backends
- **PWA**: `vite-plugin-pwa` with Workbox service worker

### apps/server — KV backend
- **Framework**: Express 5, JavaScript (ESM)
- **DB**: Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- **Auth**: JWT (HS256/RS256) + OAuth providers (STCN/Casdoor, GitHub, ZeroCat, 厚浪云/Logto)
- **Real-time**: Socket.IO server
- **Observability**: OpenTelemetry, Prometheus metrics (`/metrics`)
- **CLI**: `cli/` and `classworks.js` management script

### apps/dashboard — Admin UI
- **Framework**: Vue 3, JavaScript (no TypeScript)
- **UI**: Tailwind CSS 4 + reka-ui / radix-vue, lucide icons
- **State**: Pinia 3
- **Validation**: vee-validate + zod
- **Build**: Vite 7

## Architecture

### Data Layer (apps/web)
`apps/web/src/utils/dataProvider.js` abstracts data operations. It routes to either:
- `apps/web/src/utils/providers/kvLocalProvider.js` — IndexedDB via `idb`
- `apps/web/src/utils/providers/kvServerProvider.js` — HTTP API via axios

Server failover is handled by `apps/web/src/utils/serverRotation.js`.

### Real-time Layer
- Client: `apps/web/src/utils/socketClient.js` — Socket.IO singleton with room-based token join/leave.
- Server: `apps/server/utils/socket.js` — Socket.IO server bound to the HTTP server in `apps/server/bin/www`.

### Settings Layer (apps/web)
`apps/web/src/utils/settings.js` — Comprehensive localStorage-based settings with typed definitions, defaults, and legacy migration.

### UI Layer (apps/web)
File-based routing: each `.vue` in `apps/web/src/pages/` becomes a route. Layouts in `apps/web/src/layouts/`. The main view is `apps/web/src/pages/index.vue` (~78KB — composes homework grid, time card, noise monitor, random picker, exam schedule, etc.).

Components are organized by feature under `apps/web/src/components/`:
- `home/` — Home page components
- `settings/` — Settings cards
- `auth/` — Authentication flow
- `attendance/` — Attendance management
- `common/` — Shared components

### Key Utilities
- `apps/web/src/axios/axios.js` — Axios instance with auth interceptors and rate limit handling
- `apps/web/src/utils/api.js` — API helpers, namespace info, server rotation
- `apps/web/src/utils/visitorId.js` — FingerprintJS device identification
- `apps/web/src/utils/soundList.js` — Auto-generated from `public/sounds/` by `scripts/generate-sound-list.js` (runs as `prebuild`)

## Code Style

- 2-space indent, trim trailing whitespace (`.editorconfig` at root)
- Path alias: `@/` maps to each app's `src/` (see `apps/<app>/jsconfig.json`)
- ESLint flat config (ESLint 9) with Vue recommended rules at root (`eslint.config.js`); browser globals for `apps/web` + `apps/dashboard`, Node globals for `apps/server`
- Prettier config at root (`.prettierrc.json`); run `pnpm run format`
- Mixed Composition API and Options API usage in Vue apps
- No TypeScript

## Notes

- Dependencies are hoisted (`node-linker=hoisted` in root `.npmrc`) for compatibility with Tailwind v4 / reka-ui peer deps.
- Each app may still have its own `node_modules` due to hoisting; root `pnpm install` manages all of them.
- The server uses native modules (`bcrypt`, `@prisma/client`); on first install run `pnpm rebuild` if native binaries are missing.
- Env files (`.env`) are gitignored at all levels; copy the corresponding `.env.example` / `.env.oauth.example` in each app.
