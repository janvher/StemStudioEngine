# Communication Flow

How the AI Copilot talks to the StemStudio editor.

## End-to-End Pipeline

```
 Agent (Claude)
   │
   │  Python scripts or REST calls
   ▼
 AI 3D Sandbox Copilot  (Express server, port 3000)
   │
   │  ┌─────────────────────────────────────────────┐
   │  │ StudioMcpProxy (src/mcp/mcp_client_proxy.ts)      │
   │  │  - Converts REST → JSONRPC 2.0              │
   │  │  - Routes by apiRequestConfigs[]             │
   │  │  - Tracks pending responses by request ID    │
   │  └─────────────────────────────────────────────┘
   │
   │  JSONRPC 2.0 over WebSocket
   │  ws://host:3000/ws/mcp-reverse-proxy/:sessionId
   ▼
 StemStudio Editor (browser)
   │
   │  CommandsRegistry → CommandExecutor
   ▼
 Three.js Scene
```

## Session Model

- Each Studio editor tab opens a WebSocket to `/ws/mcp-reverse-proxy/:sessionId`
- `sessionId` is generated client-side (e.g., `studio_1768950466646_h6f7f0yg9`)
- The proxy stores streams in a `Map<string, WebSocketDuplex>`
- If a client reconnects with the same sessionId, the old stream is destroyed first
- Stream lifecycle events: `end`, `close`, `error` — all clean up the Map entry

## JSONRPC 2.0 Format

**Request (Copilot → Editor):**
```json
{
  "jsonrpc": "2.0",
  "method": "get_scene_objects",
  "id": 1,
  "params": { "filter": "Wall" }
}
```

**Response (Editor → Copilot):**
```json
{
  "jsonrpc": "2.0",
  "result": { "success": true, "data": [...] },
  "id": 1
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "error": { "code": -32600, "message": "Object not found" },
  "id": 1
}
```

## Two Execution Patterns

### 1. Python Scripts (JSONRPC generation)

Scripts in `ai/claude/skills/*/scripts/` generate JSONRPC messages:
```bash
python scripts/create_primitive.py box --name "Wall" --position 0 1 -5
```
The script outputs a JSONRPC message that the agent framework sends to the proxy.

### 2. REST API (HTTP calls)

Agent calls REST endpoints directly:
```
POST /api/studio/scene/objects/:sessionId   (body: {"filter":"Wall"})
POST /api/studio/scene/add-behavior/:sessionId  { target, behaviorId, config }
```

The proxy converts these to JSONRPC internally.

## Declarative Route Configuration

Routes are defined in `apiRequestConfigs` array in `src/mcp/mcp_client_proxy.ts`:

```typescript
type ApiRequestConfig = {
    command: string;          // JSONRPC method name
    path: string;             // URL path segment after /api/studio/scene/
    method: 'GET' | 'POST' | 'DELETE';
    queryParams?: string[];   // Required query parameters
    optionalQueryParams?: string[];
    bodyParams?: string[];    // Required body parameters
    optionalBodyParams?: string[];
}
```

Each config generates a route: `/{method} /api/studio/scene/{path}/:sessionId`

## Timeouts

- WebSocket connections: 5 minutes (`1000 * 60 * 5` ms)
- Both ACP (`/claude`) and MCP (`/ws/mcp-reverse-proxy/:sessionId`) use the same timeout
- Comment in source says "30 min timeout" but code sets 5 min

## Error Handling

- Missing stream for sessionId → HTTP 404
- Missing required parameter → HTTP 400 with param name
- JSONRPC error response → logged, forwarded via handler callback
- WebSocket write failure → handler called with error, handler removed from map
- Array JSONRPC responses → not supported, logged as error

## ACP WebSocket (`/claude`)

Separate from the MCP proxy. Used for Agent Client Protocol:
- Route: `ws://host:3000/claude`
- Bridges `@agentclientprotocol/sdk` with `@zed-industries/claude-code-acp`
- `src/acp/claude/server/claude-agent.js` (plain JS, also runs as subprocess)
- Same 5-minute timeout
