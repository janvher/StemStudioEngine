/**
 * Codex ACP Agent — delegates to @zed-industries/codex-acp.
 *
 * This file remains plain JS because it can be run directly by `node`.
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function projectRootFromHere() {
  const here = fileURLToPath(new URL(".", import.meta.url));
  return resolve(here, "../../../");
}

function codexAcpBinPath() {
  const root = projectRootFromHere();
  const bin = process.platform === "win32" ? "codex-acp.cmd" : "codex-acp";
  return resolve(root, "node_modules", ".bin", bin);
}

/**
 * @param {import("node:stream").Writable} nodeStreamIn  - writable side of the WS duplex
 * @param {import("node:stream").Readable} nodeStreamOut - readable side of the WS duplex
 * @returns {{ signal: AbortSignal }}
 */
export function runCodexAgent(nodeStreamIn, nodeStreamOut) {
  const abortController = new AbortController();

  const child = spawn(codexAcpBinPath(), [], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      OPENAI_API_KEY:
        process.env.OPENAI_API_KEY || process.env.OPENAI_CODEX_API_KEY,
      OPENAI_CODEX_API_KEY:
        process.env.OPENAI_CODEX_API_KEY || process.env.OPENAI_API_KEY,
    },
  });

  const onError = (err) => {
    if (!abortController.signal.aborted) {
      console.error("codex-acp bridge error:", err instanceof Error ? err.message : String(err));
      abortController.abort();
    }
  };

  nodeStreamOut.pipe(child.stdin);
  child.stdout.pipe(nodeStreamIn);

  child.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });

  nodeStreamOut.on("error", onError);
  nodeStreamIn.on("error", onError);
  child.on("error", onError);

  const stopChild = () => {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  };

  nodeStreamOut.on("end", stopChild);
  nodeStreamOut.on("close", stopChild);

  child.on("exit", () => {
    if (!abortController.signal.aborted) {
      abortController.abort();
    }
  });

  abortController.signal.addEventListener("abort", stopChild);

  return { signal: abortController.signal };
}

if (process.argv[1]?.endsWith("codex-agent.js")) {
  runCodexAgent(process.stdout, process.stdin);
  process.stdin.resume();
}
