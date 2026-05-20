# Colyseus multiplayer sidecar. Listens on :2567 inside the compose
# network. The site nginx (full config) proxies /colyseus/ → here.

FROM node:22-alpine AS builder

WORKDIR /app

COPY stemstudio-multiplayer/package.json stemstudio-multiplayer/package-lock.json ./
RUN npm ci

COPY stemstudio-multiplayer/ ./
RUN npm run build

# ---- runtime ------------------------------------------------------------

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY stemstudio-multiplayer/package.json stemstudio-multiplayer/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/build /app/build

EXPOSE 2567
CMD ["node", "build/src/index.js"]
