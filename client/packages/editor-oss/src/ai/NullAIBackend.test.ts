import {describe, expect, it} from "vitest";

import {NullAIBackend} from "./NullAIBackend";

describe("NullAIBackend", () => {
    it("reports every provider as missing-key", async () => {
        const backend = new NullAIBackend();
        const caps = await backend.capabilities();
        expect(caps.buildMode).toBe("oss");
        for (const provider of Object.values(caps.providers)) {
            expect(provider.status).toBe("missing-key");
            expect(provider.source).toBe("");
        }
    });

    it("setProviderKey is a no-op returning false", async () => {
        const backend = new NullAIBackend();
        expect(await backend.setProviderKey("anthropic", "sk-test")).toBe(false);
    });

    it("clearProviderKey is a no-op", async () => {
        const backend = new NullAIBackend();
        await expect(backend.clearProviderKey("anthropic")).resolves.toBeUndefined();
    });

    it("request returns a non-ok 503 response without throwing", async () => {
        const backend = new NullAIBackend();
        const res = await backend.request<{error?: string}>("/api/AI/Foo");
        expect(res.ok).toBe(false);
        expect(res.status).toBe(503);
        expect(res.data.error).toMatch(/AIBackend is not configured/);
        expect(res.data.error).toMatch(/\/api\/AI\/Foo/);
    });
});
