import {beforeEach, describe, expect, it, vi} from "vitest";

import {
    getCopilotProvider,
    setCopilotProvider,
    setCopilotProviderFactory,
} from "./copilotProviderFactory";
import type {ICopilotProvider} from "./ICopilotProvider";

const stubProvider = (): ICopilotProvider =>
    (({
        isSuppressingSessionUpdates: false,
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn(),
        isConnected: () => true,
        getConnectionState: vi.fn(),
        cancelCurrentTask: vi.fn().mockResolvedValue(undefined),
        prompt: vi.fn().mockResolvedValue(""),
        executeCommand: vi.fn().mockResolvedValue({success: true}),
        createSession: vi.fn().mockResolvedValue("session-1"),
        loadSession: vi.fn().mockResolvedValue(undefined),
        getCurrentSessionId: () => null,
        getSessionId: () => null,
        respondToPermissionRequest: vi.fn(),
        hasPendingInteractiveResults: () => false,
        checkPendingInteractiveResult: () => false,
        submitInteractiveSelectionResolution: () => false,
        on: vi.fn(),
    }));

describe("copilotProviderFactory", () => {
    beforeEach(() => {
        setCopilotProvider(undefined);
        setCopilotProviderFactory(undefined);
    });

    it("returns null when neither a provider nor a factory is registered", () => {
        expect(getCopilotProvider()).toBeNull();
    });

    it("returns a directly-set provider", () => {
        const p = stubProvider();
        setCopilotProvider(p);
        expect(getCopilotProvider()).toBe(p);
    });

    it("lazily constructs from the registered factory and memoizes the result", () => {
        const p = stubProvider();
        const factory = vi.fn().mockReturnValue(p);
        setCopilotProviderFactory(factory);

        expect(factory).not.toHaveBeenCalled();

        const first = getCopilotProvider();
        const second = getCopilotProvider();

        expect(first).toBe(p);
        expect(second).toBe(p);
        expect(factory).toHaveBeenCalledOnce();
    });

    it("setCopilotProviderFactory(undefined) clears the singleton so the next getter is null", () => {
        const p = stubProvider();
        setCopilotProviderFactory(() => p);
        expect(getCopilotProvider()).toBe(p);

        setCopilotProviderFactory(undefined);
        expect(getCopilotProvider()).toBeNull();
    });

    it("setCopilotProvider directly overrides any registered factory", () => {
        const factoryReturn = stubProvider();
        const direct = stubProvider();
        setCopilotProviderFactory(() => factoryReturn);
        setCopilotProvider(direct);
        expect(getCopilotProvider()).toBe(direct);
    });
});
