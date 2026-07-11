# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Classworks (作业板) is a homework board widget for classroom large screens. It's a Vue 3 + Vuetify 3 PWA with real-time sync via Socket.IO. The UI is in Chinese.

## Commands

```bash
pnpm install          # Install dependencies
pnpm run dev          # Dev server at localhost:3031 (network-accessible)
pnpm run build        # Production build (auto-runs prebuild to regenerate sound list)
pnpm run preview      # Preview production build
pnpm run lint         # ESLint with auto-fix
```

## Tech Stack

- **Framework**: Vue 3 (Composition API + Options API mixed), JavaScript (no TypeScript)
- **UI**: Vuetify 3 (Material Design 3), `@mdi/font` icons, SCSS
- **State**: Pinia 3
- **Routing**: Vue Router 4 with file-based routes (`unplugin-vue-router` + `vite-plugin-vue-layouts`)
- **Build**: Vite 5, pnpm
- **Real-time**: Socket.IO client (singleton in `src/utils/socketClient.js`)
- **Data**: Pluggable KV provider abstraction (`src/utils/dataProvider.js`) with IndexedDB local and HTTP server backends
- **PWA**: `vite-plugin-pwa` with Workbox service worker

## Architecture

### Data Layer

`src/utils/dataProvider.js` abstracts data operations. It routes to either:
- `src/utils/providers/kvLocalProvider.js` — IndexedDB via `idb`
- `src/utils/providers/kvServerProvider.js` — HTTP API via axios

Server failover is handled by `src/utils/serverRotation.js`.

### Real-time Layer

`src/utils/socketClient.js` — Socket.IO singleton with room-based token join/leave for live updates.

### Settings Layer

`src/utils/settings.js` — Comprehensive localStorage-based settings with typed definitions, defaults, and legacy migration. ~600 lines.

### UI Layer

File-based routing: each `.vue` in `src/pages/` becomes a route. Layouts in `src/layouts/`. The main dashboard is `src/pages/index.vue` (78KB — the core view composing homework grid, time card, noise monitor, random picker, exam schedule, etc.).

Components are organized by feature:
- `src/components/home/` — Home page components
- `src/components/settings/` — Settings cards
- `src/components/auth/` — Authentication flow
- `src/components/attendance/` — Attendance management
- `src/components/common/` — Shared components

### Key Utilities

- `src/axios/axios.js` — Axios instance with auth interceptors and rate limit handling
- `src/utils/api.js` — API helpers, namespace info, server rotation
- `src/utils/visitorId.js` — FingerprintJS device identification
- `src/utils/soundList.js` — Auto-generated from `public/sounds/` by `scripts/generate-sound-list.js` (runs as `prebuild`)

## Code Style

- 2-space indent, trim trailing whitespace (`.editorconfig`)
- Path alias: `@/` maps to `src/` (`jsconfig.json`)
- ESLint flat config (ESLint 9) with Vue recommended rules (`eslint.config.js`)
- Mixed Composition API and Options API usage
- No TypeScript
