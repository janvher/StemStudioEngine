// @ts-ignore
import { afterEach, describe, expect, it } from "bun:test";
import { buildCandidates } from "../vercel-rest/model-fallback.js";
import { buildSystemPrompt } from "../vercel-rest/system-prompt.js";
import { resolveProviderConfig } from "../vercel-rest/provider-config.js";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("Codex provider regression checks", () => {
  it("resolves codex provider with OPENAI_CODEX_API_KEY and default codex model", () => {
    process.env.OPENAI_CODEX_API_KEY = "codex-key";
    delete process.env.OPENAI_API_KEY;

    const config = resolveProviderConfig({ provider: "codex" });

    expect(config.provider).toBe("codex");
    expect(config.model).toBe("gpt-5-codex");
    expect(config.apiKey).toBe("codex-key");
  });

  it("falls back to OPENAI_API_KEY when OPENAI_CODEX_API_KEY is missing", () => {
    delete process.env.OPENAI_CODEX_API_KEY;
    process.env.OPENAI_API_KEY = "shared-openai-key";

    const config = resolveProviderConfig({ provider: "codex" });

    expect(config.provider).toBe("codex");
    expect(config.apiKey).toBe("shared-openai-key");
  });

  it("includes codex in fallback candidates with codex default model", () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-key";
    process.env.OPENAI_CODEX_API_KEY = "codex-key";

    const candidates = buildCandidates({
      provider: "anthropic",
      model: "standalone-sonnet-4-5-20250929",
      apiKey: "anthropic-key",
      fallbackProviders: ["codex"],
    });

    expect(candidates.length).toBe(2);
    expect(candidates[1].provider).toBe("codex");
    expect(candidates[1].model).toBe("gpt-5-codex");
    expect(candidates[1].apiKey).toBe("codex-key");
  });

  it("keeps codex system prompt sections aligned with shared architecture", () => {
    const prompt = buildSystemPrompt({
      provider: "codex",
      mode: "full",
      sessionId: "session-1",
      sceneContext: "scene summary",
    });

    expect(prompt.includes("Powered by Codex (OpenAI).")).toBe(true);
    expect(prompt.includes("Available Skills (load on demand)")).toBe(true);
    expect(prompt.includes("codeValidation")).toBe(true);
    expect(prompt.includes("let game;")).toBe(true);
    expect(prompt.includes("onInit")).toBe(false);
    expect(prompt.includes("Store this.game = game")).toBe(false);
    //expect(prompt.includes("Available Commands (41 total)")).toBe(true);
  });
});
