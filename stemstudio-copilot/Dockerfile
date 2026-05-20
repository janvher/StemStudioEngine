# Multi-stage build for the StemStudio copilot ACP/MCP bridge.
FROM oven/bun:1 AS builder

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --home /home/nodejs --ingroup nodejs nodejs

ENV HOME=/home/nodejs
WORKDIR /home/nodejs

# Install dependencies first for better caching.
COPY --chown=nodejs:nodejs package.json bun.lock* ./
COPY --chown=nodejs:nodejs tsconfig.json ./

RUN bun install --frozen-lockfile

# Copy source and committed type artifacts.
COPY --chown=nodejs:nodejs src src
COPY --chown=nodejs:nodejs ai ai
COPY --chown=nodejs:nodejs docs docs
COPY --chown=nodejs:nodejs stem-types.d.ts stem-events-registry.json ./

RUN bun run build

# Stage Claude Code skill set under the runtime user's home so the agent can
# discover skills at startup.
RUN mkdir -p /home/nodejs/.claude/skills && \
    cp -r ai/claude/skills/* /home/nodejs/.claude/skills/ && \
    cp -r docs/stemstudio /home/nodejs/.claude/stemstudio-docs && \
    mkdir -p /home/nodejs/.claude/stemstudio-types && \
    cp stem-types.d.ts stem-events-registry.json /home/nodejs/.claude/stemstudio-types/ && \
    if [ -d ai/claude/typefiles ]; then cp -r ai/claude/typefiles /home/nodejs/.claude/stemstudio-types/typefiles; fi && \
    chown -R nodejs:nodejs /home/nodejs/.claude

USER nodejs

EXPOSE 3000
CMD ["bun", "start"]
