# AI 3D Sandbox Copilot

A TypeScript/Bun backend service that provides AI-powered copilot capabilities for [Studio 3D (StemStudio)](https://stemstudio.app) — a browser-based 3D game engine built with Three.js and React.

The copilot receives natural language prompts from the Studio frontend and translates them into scene manipulation commands (create objects, attach behaviors, configure physics, etc.) by orchestrating AI agents with tool-calling capabilities.

## Architecture

```
                         ┌──────────────────────────────────────────────────────┐
                         │                    Copilot Server                    │
                         │                   (src/index.ts)                     │
                         │                                                      │
 ┌──────────┐  ACP/WS   │  ┌────────────────────┐    ┌──────────────────────┐  │
 │          │───────────────▶  ACP Handler        │    │  Skills (SKILL.md)   │  │
 │          │  /claude   │  │  src/acp/index.ts  │    │  + Python scripts    │  │
 │          │  /codex    │  └─────────┬──────────┘    └──────────┬───────────┘  │
 │          │            │            │                           │              │
 │          │            │            ▼                           │              │
 │  Studio  │            │  ┌─────────────────────┐              │              │
 │    3D    │            │  │  AI Agent            │◄─────────────┘              │
 │ (Browser)│            │  │  Claude Agent SDK    │   reads skills &            │
 │          │            │  │  or Codex SDK        │   runs scripts              │
 │          │            │  └─────────┬──────────┘                              │
 │          │            │            │ tool calls                              │
 │          │            │            ▼                                          │
 │          │            │  ┌──────────────────────┐                            │
 │          │  JSONRPC/WS│  │  MCP Proxy           │                            │
 │          │◄──────────────│  src/mcp/             │                            │
 │          │────────────────▶ mcp_client_proxy.ts        │                            │
 │          │  /ws/mcp-  │  │                      │                            │
 │          │  reverse-  │  │  REST ↔ JSONRPC      │                            │
 │          │  proxy/:id │  │  conversion          │                            │
 └──────────┘            │  └──────────────────────┘                            │
                         │                                                      │
                         │  ┌──────────────────────┐                            │
      REST clients ─────────▶ Vercel AI SDK Agent  │  (alternative agent path)  │
      POST /api/ai/*     │  │  src/vercel-rest/    │                            │
                         │  └──────────────────────┘                            │
                         └──────────────────────────────────────────────────────┘
```

### Three Interfaces, One Server

The Express server (`src/server/index.ts`) exposes three interfaces that work together:

#### 1. ACP WebSocket — Agent Sessions (`/claude`, `/codex`)

The [Agent Client Protocol](https://github.com/nichochar/agent-client-protocol) endpoint is how Studio 3D connects to set up an AI session. Studio initiates the WebSocket connection, authenticates via Firebase, and sends prompts. The server launches the appropriate AI agent subprocess:

- **`/claude`** — Uses `@zed-industries/claude-code-acp` which wraps the Claude Agent SDK. Skills are loaded from `~/.claude/skills/` by Claude Code natively.
- **`/codex`** — Uses `@zed-industries/codex-acp`, Zed's Codex ACP adapter.

The ACP handler (`src/acp/index.ts`) is provider-agnostic — it handles auth, stream conversion, lifecycle hooks, and session recording. Only the agent runner differs per provider.

#### 2. MCP Reverse Proxy — Scene Commands (`/api/studio/*`, `/ws/mcp-reverse-proxy/:sessionId`)

The bridge between AI agents and the Studio 3D frontend. Studio connects a persistent WebSocket at `/ws/mcp-reverse-proxy/:sessionId`. When an agent needs to manipulate the scene, it makes REST calls to `/api/studio/scene/{command}/{sessionId}`. The proxy:

1. Receives the REST request
2. Converts it to a JSONRPC 2.0 message
3. Sends it over the WebSocket to Studio
4. Waits for Studio's JSONRPC response
5. Returns it as the HTTP response

All 41+ commands are declaratively configured in `src/standalone/command-schema.ts` via `apiRequestConfigs`.

#### 3. Vercel AI SDK Agent — REST API (`/api/vercel-rest/*`)

An alternative, provider-agnostic agent path using the Vercel AI SDK v6. Supports multiple LLM providers (Anthropic, OpenAI, Codex, Google, Zhipu, MiniMax) with automatic fallback, loop detection, and token budget management. Tools are auto-generated from the same `apiRequestConfigs` used by the MCP proxy.

### Execution Flow

When a user types a prompt in Studio 3D:

```
1. Studio opens WS to /claude (or /codex)        ← ACP session setup
2. Studio opens WS to /ws/mcp-reverse-proxy/:id  ← JSONRPC channel
3. User types: "Create a red cube with physics"
4. Studio sends prompt over ACP WebSocket
5. ACP handler → launches Claude/Codex agent
6. Agent reads skills (SKILL.md) for guidance
7. Agent decides to call create_primitive tool
   ├─ Via REST:   POST /api/studio/scene/create-primitive/:sessionId
   │              → MCP Proxy converts to JSONRPC → sends over WS to Studio
   │              → Studio creates Three.js mesh → responds with JSONRPC
   │              → Proxy returns HTTP response to agent
   └─ Via script: Agent runs Python skill script that produces JSONRPC directly
                  or makes REST calls to /api/studio/*
8. Agent calls enable_physics tool (same flow)
9. Agent streams response back over ACP WebSocket
10. Studio displays result to user
```

### Skills System

Skills live in `ai/claude/skills/` and serve two purposes:

- **Guidance** (`SKILL.md`) — Markdown docs that teach the agent what commands exist, their parameters, best practices, and workflows. The agent reads these to understand *how* to manipulate the scene.
- **Scripts** (`scripts/*.py`) — Executable Python scripts that either:
  - Make REST calls to `/api/studio/*` (e.g., `create_vfx_group.py` calls the REST API directly)
  - Produce raw JSONRPC messages (e.g., `create_primitive.py` outputs a JSONRPC JSON string)

Available skill domains: `stemstudio-3d`, `stemstudio-behaviors`, `stemstudio-physics`, `stemstudio-vfx`, `stemstudio-prefabs`, `stemstudio-editor-settings`, `stemstudio-eventbus`, `stemstudio-uikit`.

## Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY
```

Required: `ANTHROPIC_API_KEY` (for Claude ACP agent)
Optional: `OPENAI_API_KEY` (for Codex agent and Vercel AI SDK OpenAI provider)

See `.env.example` for all configuration options.

### Environment Variables (Used by Code)

Core server:
- `PORT` — Express server port (default `3000`)
- `FIREBASE_CREDENTIALS_PATH` — Firebase Admin credentials JSON path (required for auth)
- `LOG_LEVEL` / `LOG_FORMAT` — logger verbosity and JSON log formatting

ACP / provider config:
- `ANTHROPIC_API_KEY` — required for `/claude` and standalone Claude mode
- `OPENAI_API_KEY` — OpenAI provider key
- `OPENAI_CODEX_API_KEY` — Codex key (falls back to `OPENAI_API_KEY`)
- `CODEX_MODEL` — model override for `/codex` ACP route
- `SUPPORT_VERCEL_AI_SDK` — set `true` to enable `/api/vercel-rest/*`

Shared Vercel REST agent:
- `AI_PROVIDER` — default provider (`anthropic|openai|codex|google|zhipu|minimax`)
- `AI_MODEL` — default model id
- `AI_FALLBACK_PROVIDERS` — comma-separated fallback provider chain
- `AI_THINKING_ENABLED` / `AI_THINKING_MODEL` / `AI_THINKING_BUDGET` — two-phase thinking controls
- `WEB_RESEARCH_ENABLED` / `WEB_RESEARCH_MAX_SEARCHES` / `WEB_RESEARCH_MAX_FETCHES` — web tool controls

Studio routing / local scripts:
- `STUDIO_API_HOST` — backend-to-backend Studio API host override (Docker/K8s)
- `STUDIO_SESSION_ID` — optional default session for standalone shared CLI mode
- `API_SERVER_BASE_URL` — base URL for Python skill scripts in `ai/claude/skills/*/scripts`

Optional provider keys for `AI_PROVIDER`:
- `GOOGLE_API_KEY` (google)
- `GLM_API_KEY` (zhipu)
- `MINIMAX_API_KEY` (minimax)

## Scripts

### Server

| Script | Command | Description |
|--------|---------|-------------|
| `start` | `bun run start` | Run the Express server (default: port 3000) |
| `dev` | `bun run dev` | Run with watch mode (auto-restart on changes) |
| `build` | `bun run build` | TypeScript compilation to `dist/` |

### CLI Tools

| Script | Command | Description |
|--------|---------|-------------|
| `cli` | `bun run cli [prompt]` | Run the copilot from terminal (no server needed) |
| `skills` | `bun run skills` | List available skills |
| `skills:run` | `bun run skills:run` | Interactive skill script runner (pick category/script and execute Python script) |
| `acp:test:local` | `bun run acp:test:local` | Test ACP via local subprocess (stdio) |
| `acp:test:ws` | `bun run acp:test:ws [url]` | Test ACP via WebSocket to running server |

### Code Generation

| Script | Command | Description |
|--------|---------|-------------|
| `generate` | `bun run generate` | Sync type files + extract types from Studio source |
| `test` | `bun run test` | Run regression tests |

## Project Structure

```
ai-3d-sandbox-copilot/
├── src/
│   ├── index.ts                    # Main entry point — starts Express server
│   ├── server/
│   │   ├── index.ts                # Express app setup, route mounting
│   │   └── cli/
│   │       └── client.ts           # Interactive ACP test client
│   ├── acp/                        # Agent Client Protocol (WebSocket)
│   │   ├── index.ts               # Shared ACP handler, mounts /claude + /codex
│   │   ├── claude/claude-agent.js  # Claude Agent SDK ↔ ACP bridge (plain JS)
│   │   └── codex/codex-agent.js    # @zed-industries/codex-acp subprocess bridge (plain JS)
│   ├── mcp/                        # MCP Reverse Proxy
│   │   ├── index.ts               # Route registration
│   │   └── mcp_client_proxy.ts           # REST ↔ JSONRPC proxy, session management
│   ├── vercel-rest/                # Vercel AI SDK agent (alternative path)
│   │   ├── agent.ts                # Multi-provider agentic loop
│   │   ├── index.ts               # REST API endpoints
│   │   ├── provider-config.ts      # Provider selection + model creation
│   │   ├── model-fallback.ts       # Provider fallback chain
│   │   ├── system-prompt.ts        # Modular prompt builder
│   │   ├── tools/
│   │   │   └── generate-tools.ts   # Auto-generates tools from apiRequestConfigs
│   │   ├── skills/
│   │   │   └── skill-loader.ts     # Loads SKILL.md files for Vercel agent
│   │   └── context/
│   │       ├── scene-context.ts    # Auto-injects scene state
│   │       └── token-budget.ts     # Per-model token limits
│   ├── standalone/                 # CLI entry points (no server)
│   │   ├── main.ts                 # CLI agent (standalone or shared mode)
│   │   ├── list-skills.ts          # Print skill catalog
│   │   ├── command-schema.ts       # Declarative API command definitions
│   │   └── system-prompt.ts        # System prompt for standalone mode
│   ├── middleware/                  # Auth middleware
│   ├── utils/                      # Shared utilities
│   │   ├── hooks/
│   │   │   ├── agent-events.ts     # AgentEventBus (lifecycle pub/sub)
│   │   │   └── payloads.ts         # Event payload types
│   │   ├── provider-availability/
│   │   │   └── index.ts            # Provider health circuit breaker
│   │   ├── session/
│   │   │   └── session-recorder.ts # Session metrics ring buffer
│   │   ├── logger.ts               # Structured logger
│   │   ├── retry.ts                # Exponential backoff
│   │   ├── loop-detection.ts       # Tool call loop detection
│   │   └── result-guard.ts         # Cap oversized JSONRPC responses
│   ├── health/                     # Health check endpoint
│   └── firebase/                   # Firebase auth
├── ai/claude/skills/               # Skill definitions (SKILL.md + Python scripts)
│   ├── stemstudio-3d/
│   ├── stemstudio-behaviors/
│   ├── stemstudio-physics/
│   ├── stemstudio-vfx/
│   ├── stemstudio-prefabs/
│   ├── stemstudio-editor-settings/
│   ├── stemstudio-eventbus/
│   └── stemstudio-uikit/
├── docs/stemstudio/                # StemStudio engine documentation
├── .env.example
├── CLAUDE.md                       # Claude Code project instructions
├── Dockerfile
└── package.json
```

## Key Technical Details

- **Runtime:** Bun (primary), Node.js compatible. ES Modules (`"type": "module"`).
- **TypeScript:** Strict mode, target ES2020, bundler module resolution.
- **ACP agent files are plain JS** (not TypeScript) because they double as standalone subprocesses launched via bare `node`, which can't run `.ts` natively.
- **WebSocket timeouts:** 5 minutes (ACP), 30 seconds (JSONRPC requests).
- **Session keying:** Each Studio client gets a `sessionId` used across both the ACP and MCP WebSocket connections.
- **No linter or formatter configured.**

## Deployment

- **Branches:** `development` → develop, `staging` → staging, `main`/`lts` → production
- **Feature branches:** `DOT-{ticket}` prefix (Jira)
- **CI/CD:** GitHub Actions → Docker build → ECR push → GitOps (updates `k8s-deployments` repo)
- **PR target:** `main` branch
- Skills are copied to `~/.claude/skills/` in Docker builds. Locally, use `./update_local_skills.sh`.

## License

ISC
