# Game server (Node + ws). Build context is the repo root because it depends on the engine and protocol workspace
# packages (engine, protocol, drills). No build step: Node 22 strips the types at runtime (erasable-syntax TS only, see tsconfig.base.json).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/protocol/package.json packages/protocol/
COPY packages/drills/package.json packages/drills/
COPY apps/game-server/package.json apps/game-server/
RUN npm ci --omit=dev --workspace @mahjong/game-server --ignore-scripts

# Runtime. Env: DATABASE_URL, ORIGIN, WEB_INTERNAL_URL (http://web:3000 in the compose app).
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.base.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/engine/src packages/engine/src
COPY packages/protocol/package.json packages/protocol/
COPY packages/protocol/src packages/protocol/src
COPY packages/drills/package.json packages/drills/
COPY packages/drills/src packages/drills/src
COPY apps/game-server/package.json apps/game-server/
COPY apps/game-server/src apps/game-server/src
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3001/healthz || exit 1
CMD ["node", "apps/game-server/src/main.ts"]
