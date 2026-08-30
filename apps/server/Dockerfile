FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# --- dependency layer (changes only when package files change) ---
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile --prod

# --- build layer (prisma generate, etc.) ---
FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/

RUN cd apps/server && npx prisma generate

# --- runtime ---
FROM base

ENV NODE_ENV=production
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/server ./apps/server
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

EXPOSE 3000

WORKDIR /app/apps/server
ENTRYPOINT ["node", "classworks.js"]
CMD []
