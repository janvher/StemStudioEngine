# buildwithstem.com — site + editor + player static bundle.
#
# Two-stage build:
#   1. `builder` — install deps with bun, run the OSS Vite build, produce
#      build/public/ with all four shells (index.html / shell.html /
#      editor.html / play.html) and the _redirects file.
#   2. `runner` — minimal nginx image that serves build/public/ and uses
#      one of the nginx configs in docker/ for static-host routing.
#
# Override the active nginx config by mounting either
# docker/nginx.basic.conf or docker/nginx.full.conf at
# /etc/nginx/conf.d/default.conf. docker-compose.yml does this.

# ---- Stage 1: build ---------------------------------------------------------

FROM oven/bun:1.2 AS builder

WORKDIR /app

# Manifests first so bun install is cacheable independent of source changes.
COPY package.json bun.lock ./
COPY stemstudio-multiplayer/package.json stemstudio-multiplayer/package.json
COPY stemstudio-multiplayer/package-lock.json stemstudio-multiplayer/package-lock.json
COPY stemstudio-copilot/package.json stemstudio-copilot/package.json

# Lock-respecting install. `postinstall` recursively installs the
# multiplayer + copilot sidecars; we skip that here because they're not
# needed to build the static bundle — pass --ignore-scripts then run the
# draco copy step that the host-side build also depends on.
RUN bun install --frozen-lockfile --ignore-scripts

# Copy everything else. .dockerignore filters out node_modules, build
# output, planning docs, and the heavy local-only directories.
COPY . .

# Draco binaries land in client/assets so vite picks them up.
RUN bun scripts/copy-draco.js

# Static build of the OSS bundle.
RUN BUILD_MODE=oss bunx --bun vite --emptyOutDir build
RUN bun scripts/copy.js

# Sanity-check that all four shells made it through.
RUN test -f build/public/index.html \
 && test -f build/public/shell.html \
 && test -f build/public/editor.html \
 && test -f build/public/play.html \
 && test -f build/public/_redirects

# ---- Stage 2: runtime -------------------------------------------------------

FROM nginx:1.27-alpine AS runner

# Default to the basic (no-AI) routing config. docker-compose.full.yml
# overrides this by mounting nginx.full.conf at the same path.
COPY docker/nginx.basic.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/build/public /usr/share/nginx/html

RUN rm -f /usr/share/nginx/html/index.nginx-debian.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
