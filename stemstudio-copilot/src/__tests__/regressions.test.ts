// @ts-ignore
import { afterEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { generateStudioTools } from "../vercel-rest/tools/generate-tools.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("AI tools regression checks", () => {
  it("preserves structured JSON in tool request bodies", async () => {
    let requestBody = "";

    globalThis.fetch = async (_input: any, init?: RequestInit) => {
      requestBody = String(init?.body ?? "");
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const tools = generateStudioTools("session-test");
    const result = await tools.set_scene_lighting.execute({
      ambient: { intensity: 0.6, color: "#ffffff" },
      shadows: { enabled: true, type: "pcfsoft" },
    });

    expect(result).toEqual({ ok: true });
    const parsedBody = JSON.parse(requestBody);
    expect(parsedBody.ambient).toEqual({ intensity: 0.6, color: "#ffffff" });
    expect(parsedBody.shadows).toEqual({ enabled: true, type: "pcfsoft" });
  });
});

/*describe("MCP API regression checks", () => {
  it("uses JSON responses for stream-not-found and missing-params paths", () => {
    const sourcePath = path.join(process.cwd(), "src", "mcp", "mcp_client_proxy.ts");
    const source = fs.readFileSync(sourcePath, "utf-8");

    console.log(`SRC: ${source}`);
    expect(source.includes('res.status(404).json({ error: "No stream for session"')).toBe(true);
    expect(source.includes('res.status(400).json({')).toBe(true);
    expect(source.includes(".send(\"No stream for session: \" + sessionId)")).toBe(false);
    expect(source.includes("Missing param ${paramName} in request")).toBe(true);
  });
});*/

describe("Build script regression check", () => {
  it("fails fast when sync:typefiles fails (no ';' separator)", () => {
    const packageJsonPath = path.join(process.cwd(), "package.json");
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    expect(typeof pkg.scripts?.build).toBe("string");
    expect(pkg.scripts.build.includes("&&")).toBe(true);
    expect(pkg.scripts.build.includes(";")).toBe(false);
  });
});
