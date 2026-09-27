# Web app (SvelteKit, adapter-node). Build context is the repo root because the app depends on
# the engine workspace package.

FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so they are cached until a package.json or the lockfile changes.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY packages/engine packages/engine
COPY apps/web apps/web
COPY tsconfig.base.json ./
RUN npm run build --workspace @mahjong/web

# Runtime: the adapter bundles the app and the engine, so no node_modules are needed.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /app/apps/web/build ./build
RUN echo '{ "type": "module" }' > package.json
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "build"]
