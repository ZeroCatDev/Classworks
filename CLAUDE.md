# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Classworks (作业板) is a pnpm monorepo for a homework board platform designed for classroom large screens. The UI is in Chinese.

| App        | Package                 | Path              | Stack                                |
| ---------- | ----------------------- | ----------------- | ------------------------------------ |
| 作业板 PWA | `@classworks/web`       | `apps/web`        | Vue 3 + Vuetify 3, Vite 5            |
| KV 后端    | `@classworks/server`    | `apps/server`     | Express 5 + Prisma 7 + Socket.IO     |
| 管理面板   | `@classworks/dashboard` | `apps/dashboard`  | Vue 3 + Tailwind 4 + reka-ui, Vite 7 |
| 共享常量   | `@classworks/shared`    | `packages/shared` | Pure JS (ESM)                        |

## Commands

All commands run from the repo root.

```bash
pnpm install              # Install all workspace dependencies

# All apps
pnpm run dev              # Dev servers in parallel (web :3031, server :3000, dashboard vite default)
pnpm run build            # Build all apps
pnpm run lint             # ESLint with auto-fix
pnpm run format           # Prettier write
pnpm run format:check     # Prettier check

# Single app
pnpm run dev:web
pnpm run dev:server
pnpm run dev:dashboard
pnpm run build:web
pnpm run build:server     # prisma generate
pnpm run build:dashboard

# Filter syntax
pnpm --filter @classworks/web run dev
pnpm --filter @classworks/server run start
```

## Tech Stack

- **Language**: JavaScript (no TypeScript), ESM throughout
- **apps/web**: Vue 3 (mixed Composition/Options API), Vuetify 3, Pinia, Vue Router 4 (file-based routes), Socket.IO client, PWA (Workbox), SCSS
- **apps/server**: Express 5, Prisma 7 + PostgreSQL, Socket.IO server, JWT auth, OpenTelemetry, Prometheus metrics
- **apps/dashboard**: Vue 3 (Composition API), Tailwind CSS 4, reka-ui/radix-vue, Pinia, vee-validate + zod
- **packages/shared**: Header constants, server URLs — imported by all apps

## Architecture

### Shared Package (`packages/shared`)

`@classworks/shared` exports constants used across all apps: HTTP header names (`HEADER_APP_TOKEN`, `HEADER_SITE_KEY`, `HEADER_DEVICE_UUID`), default server URLs, and the cloud server list. Import from `@classworks/shared` or `@classworks/shared/headers`.

### Data Layer (apps/web)

`dataProvider.js` routes to either `kvLocalProvider.js` (IndexedDB) or `kvServerProvider.js` (HTTP). Server failover via `serverRotation.js`.

### Real-time Layer

Client: `apps/web/src/utils/socketClient.js`. Server: `apps/server/utils/socket.js`.

### Settings Layer (apps/web)

`settings.js` — localStorage-based settings with typed definitions, defaults, and legacy migration.

### UI Layer (apps/web)

File-based routing from `src/pages/`. Main view: `src/pages/index.vue` (~78KB). Components organized by feature under `src/components/`.

## Code Style

- 2-space indent, trim trailing whitespace (`.editorconfig`)
- Path alias: `@/` maps to each app's `src/` (`jsconfig.json`)
- ESLint 9 flat config at root; Prettier at root (`.prettierrc.json`)
- Mixed Composition API and Options API in Vue apps
- No TypeScript
