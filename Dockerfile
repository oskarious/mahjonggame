# Web app (SvelteKit, adapter-node). Build context is the repo root because the app depends on
# the engine and protocol workspace packages.

FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so they are cached until a package.json or the lockfile changes.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/protocol/package.json packages/protocol/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY packages/engine packages/engine
COPY packages/protocol packages/protocol
COPY apps/web apps/web
COPY tsconfig.base.json ./
RUN npm run build --workspace @mahjong/web

# Production node_modules for the web app only (better-auth, pg). The engine, protocol and Svelte are bundled into the build.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/protocol/package.json packages/protocol/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev --workspace @mahjong/web --ignore-scripts

# Runtime. Migrations are bundled into the build and run on startup.
# Env: DATABASE_URL, BETTER_AUTH_SECRET, ORIGIN (or BETTER_AUTH_URL).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/build ./apps/web/build
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "apps/web/build"]
