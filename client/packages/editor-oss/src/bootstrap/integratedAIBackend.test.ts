import {beforeEach, describe, expect, it, vi} from "vitest";

const backendUrlFromPathMock = vi.fn();
vi.mock("../utils/UrlUtils", () => ({
    backendUrlFromPath: (path: string) => backendUrlFromPathMock(path),
}));

const setAIBackendMock = vi.fn();
const httpAIBackendCtor = vi.fn();
vi.mock("@stem/editor-oss/ai", () => ({
    HttpAIBackend: class {
        constructor(opts: unknown) {
            httpAIBackendCtor(opts);
        }
    },
    setAIBackend: (b: unknown) => setAIBackendMock(b),
}));

describe("initIntegratedAIBackend", () => {
    beforeEach(() => {
        backendUrlFromPathMock.mockReset();
        setAIBackendMock.mockReset();
        httpAIBackendCtor.mockReset();
        vi.resetModules();
    });

    it("registers an HttpAIBackend whose resolveUrl delegates to backendUrlFromPath", async () => {
        backendUrlFromPathMock.mockImplementation((p: string) => `https://api.test${p}`);

        const {initIntegratedAIBackend: init} = await import("./integratedAIBackend");
        init();

        expect(httpAIBackendCtor).toHaveBeenCalledOnce();
        expect(setAIBackendMock).toHaveBeenCalledOnce();

        const opts = httpAIBackendCtor.mock.calls[0]![0] as {resolveUrl: (p: string) => string};
        expect(opts.resolveUrl("/api/AI/Capabilities")).toBe("https://api.test/api/AI/Capabilities");
        expect(backendUrlFromPathMock).toHaveBeenCalledWith("/api/AI/Capabilities");
    });

    it("falls back to the raw path when backendUrlFromPath returns undefined", async () => {
        backendUrlFromPathMock.mockReturnValue(undefined);

        const {initIntegratedAIBackend: init} = await import("./integratedAIBackend");
        init();

        const opts = httpAIBackendCtor.mock.calls[0]![0] as {resolveUrl: (p: string) => string};
        expect(opts.resolveUrl("/api/AI/Foo")).toBe("/api/AI/Foo");
    });

    it("is idempotent — calling twice still wires the backend once", async () => {
        backendUrlFromPathMock.mockReturnValue("/x");

        const mod = await import("./integratedAIBackend");
        mod.initIntegratedAIBackend();
        mod.initIntegratedAIBackend();

        expect(setAIBackendMock).toHaveBeenCalledOnce();
        expect(httpAIBackendCtor).toHaveBeenCalledOnce();
    });
});
