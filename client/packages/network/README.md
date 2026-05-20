# @stem/network

Pluggable network layer for the StemStudio open-source editor. The editor's
HTTP / REST traffic flows through this package's adapter so a fork can swap
in a different backend (a self-hosted Node mock, an alternative cloud
provider, an OpenAPI-compatible reimplementation, etc.) without touching
the engine itself.

## What ships today

### Adapter selection

`createBackendAdapter("editor" | "play")` runs once at app boot and returns:

```typescript
type BackendAdapter = {
    mode: "remote" | "local";
    entrypoint: "editor" | "play";
    server: string;   // base URL the API client should hit
};
```

Mode resolution:

1. Query string — `?backend=local|remote` (preferred for one-off testing).
2. Local storage — `stem.backend.mode` (sticky once chosen via query).
3. Env — `REACT_ENGINE_BACKEND_MODE`.
4. Default — `remote` (canonical Go backend).

When `mode === "local"` the local server origin is resolved from
`?localBackendUrl=` / `?localServer=` / `REACT_ENGINE_LOCAL_BACKEND_URL`,
falling back to `${protocol}//${hostname}:3030`. The Node reference server
that satisfies this contract lives at `web/packages/local-backend/` in this
repo.

The active adapter is stashed on `window.__STEM_BACKEND_ADAPTER__` so
consumers can read it without re-resolving.

### REST API surface

The 35 domain modules (scenes, assets, behaviors, audio, …) that wrap the
Go backend's REST endpoints live at `web/packages/network/src/adapters/remote-go/`.
They're exported under the `@stem/network/api/*` subpath via a tsconfig
+ vite path alias:

```typescript
// Preferred: target the library boundary
import {getScene} from "@stem/network/api/scene/v2";

// Legacy alias kept for the 200+ existing import sites — still resolves
// to the same files
import {getScene} from "@web-shared/api/scene/v2";
```

The legacy `@web-shared/api/*` alias is preserved by an explicit
tsconfig/vite rule that takes precedence over the bare `@web-shared/*`
mapping, so existing code keeps working without modification while new
code can target the canonical `@stem/network/api/*` path.

A sibling `local-node/` adapter directory exists as a placeholder for the
Node reference server in `web/packages/local-backend/`. See
`adapters/local-node/README.md` for the roadmap.

## Future direction (not in this PR)

Split today's single REST surface into per-adapter implementations:

```
web/packages/network/src/
├── adapter.ts                     # mode selection (here today)
├── api.ts                         # canonical TypeScript interface
└── adapters/
    ├── remote-go/                 # default — wraps shared/src/api/*
    └── local-node/                # talks to web/packages/local-backend/
```

`adapter.ts` then returns the active adapter object (which exposes the
canonical `api.ts` interface), not just a server URL, so the API surface
itself becomes pluggable rather than just the base URL.

## Writing your own adapter

Until the per-adapter split lands, the integration point is the mode
selector. You can:

1. Implement an HTTP server that speaks the canonical Go backend's REST
   shape (see `server/` in the parent repo for the contract, or
   `web/packages/local-backend/` for a minimal Node reference).
2. Start your server on a different origin.
3. Launch the editor with `?backend=local&localBackendUrl=https://your-server`
   to point the entire frontend at it.

Once the per-adapter split lands, you'll be able to implement the
canonical `CopilotProvider`-style interface from this package directly
and skip the HTTP layer.
