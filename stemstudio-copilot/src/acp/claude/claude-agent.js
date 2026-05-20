/**
 * Claude ACP Agent — bridges @zed-industries/claude-code-acp with the ACP protocol.
 *
 * This file is intentionally plain JS (not TypeScript) because it doubles as a
 * standalone subprocess entry point launched via bare `node`:
 *   - Standalone CLI: src/standalone/cli/client.ts spawns `node <path>` with stdio pipes
 *   - WebSocket:      src/acp/index.ts imports runAcp() and calls it in-process under Bun
 *
 * Since `node` cannot execute .ts files natively, this must remain .js.
 */

import {AgentSideConnection, ndJsonStream} from "@agentclientprotocol/sdk";
import {
  ClaudeAcpAgent,
  nodeToWebReadable,
  nodeToWebWritable,
} from "@ni2khanna/claude-agent-acp";
import {getProjectFolderName, getProjectFolderPath, getUserFolder} from "../../utils/config.ts";
import {verifyIdToken} from "../../utils/firebase/firebase.ts";
import {mkdir} from "node:fs/promises";
import {BackupService} from "../../backup/backup-service.ts";
import {setInterval} from "node:timers";

const STALE_SESSION_CHECK_INTERVAL_MS = 1000 * 60; //every 1 minute
const STALE_SESSION_EXPIRATION_MS = 1000 * 60 * 20; //20 minutes

const killStaleOrDisconnectedAgent = (connection, nodeStreamIn) => {
  nodeStreamIn.on('close', () => {
    console.log(`Closing ACP server...`);
    for (const sessionId of Object.keys(connection.sessions)) {
      console.log(`Closing session: ${sessionId}`);
      try { connection.sessions[sessionId].query.close(); } catch (_) {}
    }
  });
  //kill stale sessions after 5 mins of inactivity
  const intervalId = setInterval(() => {
    //console.log(`Checking for stale sessions: ${Date.now() - connection.lastCreditUsageTimestamp}`);
    if (Date.now() - connection.lastCreditUsageTimestamp > STALE_SESSION_EXPIRATION_MS) {
      //kill claude process
      for (const sessionId of Object.keys(connection.sessions)) {
        console.log(`Closing stale session: ${sessionId}`);
        try { connection.sessions[sessionId].query.close(); } catch (_) {}
      }
      //close ACP in-stream - it's triggering 'close' event on the corresponding mux stream
      nodeStreamIn.destroy();
      //stop inactivity check
      clearInterval(intervalId);
    }
  }, STALE_SESSION_CHECK_INTERVAL_MS);
}

// Keep the built-in tool surface small so Claude spends fewer tokens on tool
// selection and follows the skill-driven StemStudio workflow consistently.
const PROJECT_CLAUDE_TOOLS = ["Bash", "Read", "Glob", "Grep", "Task", "Skill", "TodoWrite", "WebFetch", "WebSearch"];
const PROJECT_DISALLOWED_CLAUDE_TOOLS = ["Edit", "Write"];

function withProjectClaudeOptions(params) {
  const nextParams = {
    ...params,
    _meta: {
      ...(params?._meta ?? {}),
      claudeCode: {
        ...(params?._meta?.claudeCode ?? {}),
        options: {
          ...(params?._meta?.claudeCode?.options ?? {}),
          tools: PROJECT_CLAUDE_TOOLS,
          disallowedTools: Array.from(new Set([
            ...(params?._meta?.claudeCode?.options?.disallowedTools ?? []),
            ...PROJECT_DISALLOWED_CLAUDE_TOOLS,
          ])),
          betas: ['context-1m-2025-08-07'],
        },
      },
    },
  };

  return nextParams;
}

export function runAcp(nodeStreamIn, nodeStreamOut) {
  const input = nodeToWebWritable(nodeStreamIn);
  const output = nodeToWebReadable(nodeStreamOut);
  const stream = ndJsonStream(input, output);

  return new AgentSideConnection((client) => {
    const connection = new ProjectClaudeAgent(client);
    killStaleOrDisconnectedAgent(connection, nodeStreamIn);
    return connection;
  }, stream);
}

/**
 * Wraps the SDK query object in a Proxy that intercepts `next()` calls.
 * When a `result` message is yielded (end of a prompt turn), `onUsage` is
 * called with the authoritative token counts from the result message.
 *
 * All other methods (interrupt, setModel, setPermissionMode, …) are forwarded
 * transparently to the original query object.
 *
 * @param {object} q - The SDK query async iterator
 * @param {(usage: {inputTokens: number, outputTokens: number, totalCostUsd: number}) => void} onUsage
 */
function wrapQueryForUsageTracking(q, onUsage) {
  return new Proxy(q, {
    get(target, prop) {
      if (prop === 'next') {
        return async function () {
          const result = await target.next();
          if (result.value?.type === 'result') {
            try {
              const inputTokens = result.value.usage?.input_tokens ?? 0;
              const outputTokens = result.value.usage?.output_tokens ?? 0;
              const totalCostUsd = result.value.total_cost_usd ?? 0;
              if (inputTokens > 0 || outputTokens > 0) {
                await Promise.resolve(onUsage({ inputTokens, outputTokens, totalCostUsd }));
              }
            } catch (e) {
              console.error('Error in usage callback:', e);
            }
          }
          return result;
        };
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/**
 * Subclass of ClaudeAcpAgent that proxies `this.sessions` to intercept query
 * creation and wrap each query iterator with usage tracking.
 */
class ProjectClaudeAgent extends ClaudeAcpAgent {
  async newSession(params) {
    return super.newSession(withProjectClaudeOptions(params));
  }

  async unstable_resumeSession(params) {
    return super.unstable_resumeSession(withProjectClaudeOptions(params));
  }

  async unstable_forkSession(params) {
    return super.unstable_forkSession(withProjectClaudeOptions(params));
  }

  async loadSession(params) {
    return super.loadSession(withProjectClaudeOptions(params));
  }
}

class UsageTrackingAgent extends ProjectClaudeAgent {
  constructor(client, onUsage, studioSessionId) {
    super(client);
    this.studioSessionId = studioSessionId;
    const onUsageFn = onUsage;
    this.sessions = new Proxy(
      {},
      {
        set(target, key, value) {
          if (value && value.query) {
            target[key] = { ...value, query: wrapQueryForUsageTracking(value.query, onUsageFn) };
          } else {
            target[key] = value;
          }
          return true;
        },
        get(target, key) {
          return target[key];
        },
        deleteProperty(target, key) {
          delete target[key];
          return true;
        },
      },
    );
  }

  /**
   * Inject STUDIO_SESSION_ID into _meta.claudeCode.options.env so skill
   * Python scripts can call the REST API without a --sessionId CLI flag.
   */
  withStudioSessionEnv(params) {
    if (!this.studioSessionId) return params;
    return {
      ...params,
      _meta: {
        ...(params?._meta ?? {}),
        claudeCode: {
          ...(params?._meta?.claudeCode ?? {}),
          options: {
            ...(params?._meta?.claudeCode?.options ?? {}),
            env: {
              ...(params?._meta?.claudeCode?.options?.env ?? {}),
              STUDIO_SESSION_ID: this.studioSessionId,
            },
          },
        },
      },
    };
  }

  async createCwd(params) {
    //create a user folder (if needed)
    const decodedToken = await verifyIdToken(params?._meta?.token);
    if (!decodedToken) {
      throw new Error("Invalid token");
    }

    params.cwd = getUserFolder(decodedToken.uid);

    // Restore from backup FS if available; otherwise create fresh folder.
    // getProjectFolder() returns a flattened path string used only for logging.
    console.log(`Creating user folder: ${params.cwd} -> ${getProjectFolderName(decodedToken.uid)}`);
    await BackupService.getInstance().restoreIfExists(decodedToken.uid, getProjectFolderPath(decodedToken.uid));
    await mkdir(params.cwd, { recursive: true });

    return decodedToken.uid;
  }

  async unstable_resumeSession(params) {
    //create a user folder (if needed)
    const uid = await this.createCwd(params);

    let resumeSessionResponse = null;
    try {
      console.log(`Resuming session: ${params.sessionId}`);
      resumeSessionResponse = await super.unstable_resumeSession(this.withStudioSessionEnv(params));
    } catch (e) {
      console.error(`Failed to resume session: ${e.message}`);
      return Promise.reject(e);
    }

    // Register session for periodic backup (idempotent — safe if user already has an active session).
    BackupService.getInstance().register(uid, getProjectFolderPath(uid), params.sessionId);

    return Promise.resolve(resumeSessionResponse);
  }

  async loadSession(params) {
    //create a user folder (if needed)
    const uid = await this.createCwd(params);

    let loadSessionResponse = null;
    try {
      loadSessionResponse = await super.loadSession(this.withStudioSessionEnv(params));
    } catch (e) {
      console.error(`Failed to load session: ${e.message}`);
      return Promise.reject(e);
    }

    // Register session for periodic backup (idempotent — safe if user already has an active session).
    BackupService.getInstance().register(uid, getProjectFolderPath(uid), params.sessionId);

    return Promise.resolve(loadSessionResponse);
  }

  async newSession(params) {
    //create a user folder (if needed)
    const uid = await this.createCwd(params);

    let newSessionResponse = null;
    try {
      newSessionResponse = await super.newSession(this.withStudioSessionEnv(params));
    } catch (e) {
      console.error(`Failed to create session: ${e.message}`);
      return Promise.reject(e);
    }

    // Register session for periodic backup (idempotent — safe if user already has an active session).
    BackupService.getInstance().register(uid, getProjectFolderPath(uid), newSessionResponse.sessionId);

    return Promise.resolve(newSessionResponse);
  }
}

/**
 * Like `runAcp` but calls `onUsage` after each completed prompt turn with the
 * token counts from the Claude SDK result message.
 *
 * @param {NodeJS.ReadableStream} nodeStreamIn
 * @param {NodeJS.WritableStream} nodeStreamOut
 * @param {(usage: {inputTokens: number, outputTokens: number, totalCostUsd: number}) => Promise<void>} onUsage
 * @param {string} [studioSessionId] Studio session ID injected as STUDIO_SESSION_ID env var for skill scripts
 */
export function runAcpWithUsageCallback(nodeStreamIn, nodeStreamOut, onUsage, studioSessionId) {
  const input = nodeToWebWritable(nodeStreamIn);
  const output = nodeToWebReadable(nodeStreamOut);
  const stream = ndJsonStream(input, output);
  console.log('Starting ACP server with usage tracking...');
  return new AgentSideConnection((client) => {
    const connection = new UsageTrackingAgent(client, async (usage) => {
      connection.lastCreditUsageTimestamp = Date.now();
      await onUsage(usage);
    }, studioSessionId);
    connection.lastCreditUsageTimestamp = Date.now();
    killStaleOrDisconnectedAgent(connection, nodeStreamIn);
    return connection;
  }, stream);
}

if (process.argv[1]?.endsWith("claude-agent.js")) {
  runAcp(process.stdin, process.stdout);
  // Keep process alive
  process.stdin.resume();
}
