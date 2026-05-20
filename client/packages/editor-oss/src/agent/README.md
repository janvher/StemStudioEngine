# Agent Client Protocol (ACP) Implementation

This directory contains the implementation of the Agent Client Protocol for Studio 3D.

## Files

### Core Components

- **`StudioACPClient.ts`** - WebSocket client for ACP communication
- **`CommandsRegistry.ts`** - Registry of available commands
- **`CommandsExecutor.ts`** - Command execution engine
- **`types/ACPTypes.ts`** - TypeScript type definitions

## Quick Overview

### StudioACPClient

Main entry point for ACP communication. Manages WebSocket connection, message routing, and event handling.

```typescript
import {StudioACPClient} from "./agent/StudioACPClient";

const client = new StudioACPClient(app, "ws://localhost:8080/acp");
await client.connect();

const result = await client.executeTask("Create a red cube");
```

### CommandsRegistry

Defines all available commands that the AI agent can execute. Each command includes:

- Name and description
- Parameter schema with types
- Handler function
- Examples

**Registered Commands:**

- createObject, deleteObject, modifyObject
- getSceneObjects, getObject, getSelectedObject, getPlayer
- setMaterial, setTexture
- attachBehavior, detachBehavior
- setCameraPosition
- searchAssets

### CommandsExecutor

Executes commands with validation, error handling, and history tracking.

```typescript
const executor = client.getExecutor();

// Execute single command
await executor.executeCommand("createObject", {
    type: "box",
    color: "#ff0000",
});

// Execute batch
await executor.executeCommandBatch(steps, onProgress);

// Get statistics
const stats = executor.getStatistics();
```

### ACPTypes

Complete TypeScript definitions for:

- Message types (request, response, notification)
- Connection states
- Events
- Command capabilities
- Task execution

## Usage

See the main documentation:

- [ACP Implementation Guide](../docs/ACP_IMPLEMENTATION.md)
- [Quick Start Guide](../docs/ACP_QUICK_START.md)
- [Summary](../docs/ACP_SUMMARY.md)

## Architecture

```
StudioACPClient
    ├── CommandsRegistry (defines available commands)
    ├── CommandsExecutor (executes commands)
    └── WebSocket (communication with agent)
```

## Events

The ACP client emits various events:

```typescript
client.on("connected", () => {
    /* ... */
});
client.on("disconnected", () => {
    /* ... */
});
client.on("taskStarted", event => {
    /* ... */
});
client.on("taskProgress", event => {
    /* ... */
});
client.on("taskCompleted", event => {
    /* ... */
});
client.on("commandExecuted", event => {
    /* ... */
});
client.on("error", event => {
    /* ... */
});
```

## Testing

Use the mock agent server for testing:

```bash
node examples/mock-acp-agent-server.js
```

## Adding New Commands

1. Register in `CommandsRegistry.registerDefaultCommands()`:

```typescript
this.registerCommand({
    name: "myCommand",
    description: "What it does",
    parameters: [{name: "param", type: "string", required: true}],
    handler: async params => this.handleMyCommand(params),
});
```

2. Implement the handler:

```typescript
private async handleMyCommand(params: any): Promise<any> {
  // Implementation
  return result;
}
```

## License

See project LICENSE file.
