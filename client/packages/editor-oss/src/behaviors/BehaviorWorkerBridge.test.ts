import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import {BehaviorBase} from "./Behavior";
import {
    BehaviorWorkerBridge,
    getActiveWorkerCount,
    resetActiveWorkerCount,
} from "./worker/BehaviorWorkerBridge";

// Mock Comlink — we test the bridge logic, not Comlink internals
const mockProxy = {
    init: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    sendMessage: vi.fn(),
    dispose: vi.fn().mockResolvedValue(undefined),
    setOnPostToMain: vi.fn(),
    [Symbol.for("Comlink.releaseProxy")]: vi.fn(),
};

vi.mock("comlink", () => {
    const releaseProxy = Symbol.for("Comlink.releaseProxy");
    return {
        wrap: vi.fn(() => mockProxy),
        proxy: vi.fn((fn: any) => fn),
        releaseProxy,
    };
});

class MockWorker {
    onmessage: ((e: MessageEvent) => void) | null = null;
    onerror: ((e: ErrorEvent) => void) | null = null;
    postMessage = vi.fn();
    terminate = vi.fn();
}

const OriginalWorker = globalThis.Worker;

beforeEach(() => {
    resetActiveWorkerCount();
    vi.clearAllMocks();
    (globalThis as any).Worker = MockWorker;
});

afterEach(() => {
    (globalThis as any).Worker = OriginalWorker;
});

describe("BehaviorWorkerBridge", () => {
    /**
     *
     * @param overrides
     */
    function createMockBehavior(overrides: Record<string, any> = {}) {
        return {
            id: "test.behavior",
            uuid: "test-uuid",
            onWorkerMessage: vi.fn(),
            getWorkerInitData: () => ({foo: "bar"}),
            ...overrides,
        } as any;
    }

    it("init creates worker and wraps with Comlink", () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        const result = bridge.init(MockWorker as any);
        expect(result).toBe(true);
        expect(bridge.isActive).toBe(true);
        expect(getActiveWorkerCount()).toBe(1);
    });

    it("sendInit calls proxy.setOnPostToMain and proxy.init", async () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        bridge.init(MockWorker as any);

        bridge.sendInit({foo: "bar"});

        expect(mockProxy.setOnPostToMain).toHaveBeenCalled();
        expect(mockProxy.init).toHaveBeenCalledWith({foo: "bar"});
    });

    it("sendStart calls proxy.start", () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        bridge.init(MockWorker as any);

        bridge.sendStart();
        expect(mockProxy.start).toHaveBeenCalled();
    });

    it("sendStop calls proxy.stop", () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        bridge.init(MockWorker as any);

        bridge.sendStop();
        expect(mockProxy.stop).toHaveBeenCalled();
    });

    it("sendMessage calls proxy.sendMessage", () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        bridge.init(MockWorker as any);

        bridge.sendMessage("test", {value: 1});
        expect(mockProxy.sendMessage).toHaveBeenCalledWith("test", {value: 1});
    });

    it("routes worker→main callback to behavior.onWorkerMessage", async () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        bridge.init(MockWorker as any);

        bridge.sendInit({});

        // Extract the callback passed to setOnPostToMain
        const callback = mockProxy.setOnPostToMain.mock.calls[0]![0];
        callback("result", {value: 42});

        expect(behavior.onWorkerMessage).toHaveBeenCalledWith("result", {value: 42});
    });

    it("dispose terminates worker and releases proxy", () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        bridge.init(MockWorker as any);
        expect(getActiveWorkerCount()).toBe(1);

        const worker = (bridge as any).worker as MockWorker;
        bridge.dispose();

        expect(mockProxy.dispose).toHaveBeenCalled();
        expect(worker.terminate).toHaveBeenCalled();
        expect(bridge.isActive).toBe(false);
        expect(getActiveWorkerCount()).toBe(0);
    });

    it("respects max worker limit of 16", () => {
        const bridges: BehaviorWorkerBridge[] = [];
        const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
        for (let i = 0; i < 17; i++) {
            const behavior = createMockBehavior({id: `test.behavior.${i}`});
            const bridge = new BehaviorWorkerBridge(behavior);
            const result = bridge.init(MockWorker as any);
            bridges.push(bridge);
            if (i < 16) {
                expect(result).toBe(true);
            } else {
                expect(result).toBe(false);
            }
        }
        expect(getActiveWorkerCount()).toBe(16);

        bridges.forEach(b => b.dispose());
        consoleWarn.mockRestore();
    });

    it("sendInit is a no-op when not initialized", () => {
        const behavior = createMockBehavior();
        const bridge = new BehaviorWorkerBridge(behavior);
        // Should not throw
        bridge.sendInit({});
        expect(mockProxy.init).not.toHaveBeenCalled();
    });

    it("BehaviorBase includes runtime in default worker init data", () => {
        const behavior = new BehaviorBase({} as any, "test.behavior", {
            gameObject: {} as any,
            erth: {} as any,
        });

        expect(behavior.getWorkerInitData("play")).toEqual({runtime: "play"});
        expect(behavior.getWorkerInitData("editor")).toEqual({runtime: "editor"});
    });
});
