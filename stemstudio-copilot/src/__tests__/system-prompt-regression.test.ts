import { describe, expect, it } from "bun:test";
import { STEMSTUDIO_SYSTEM_PROMPT } from "../standalone/system-prompt.js";
import { buildSystemPrompt, mergeSystemPrompt } from "../vercel-rest/system-prompt.js";

describe("System prompt alignment checks", () => {
  it("keeps Claude mode prompt aligned with shared Anthropic full prompt", () => {
    const sharedAnthropicPrompt = buildSystemPrompt({
      provider: "anthropic",
      mode: "full",
    });

    expect(STEMSTUDIO_SYSTEM_PROMPT).toBe(sharedAnthropicPrompt);
  });

  it("appends client system prompt without dropping canonical guardrails by default", () => {
    const canonical = "Base Prompt";
    const merged = mergeSystemPrompt(canonical, "Client Prompt");

    expect(merged.includes("Base Prompt")).toBe(true);
    expect(merged.includes("Client Prompt")).toBe(true);
    expect(merged.includes("Client System Prompt Extension")).toBe(true);
  });

  it("supports explicit replace mode for client system prompt", () => {
    const merged = mergeSystemPrompt("Base Prompt", "Client Prompt", "replace");
    expect(merged).toBe("Client Prompt");
  });

  it("locks in closure-pattern and validator-first behavior guidance", () => {
    const prompt = buildSystemPrompt({
      provider: "anthropic",
      mode: "full",
    });

    expect(prompt.includes("let game;")).toBe(true);
    expect(prompt.includes("codeValidation")).toBe(true);
    expect(prompt.includes("this.erth.behaviors.find")).toBe(true);
    expect(prompt.includes("Store this.game = game")).toBe(false);
    expect(prompt.includes("onInit")).toBe(false);
    expect(prompt.includes("onUpdate")).toBe(false);
  });
});
