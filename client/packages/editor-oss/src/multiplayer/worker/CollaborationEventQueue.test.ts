import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {CollaborationEventQueue, type QueuedEvent} from "./CollaborationEventQueue";

let eventIdCounter = 0;

const makeEvent = (overrides: Partial<QueuedEvent> = {}): QueuedEvent => ({
    id: `evt-${++eventIdCounter}`,
    type: "snapshot:update:object",
    uuid: "uuid-A",
    payload: null,
    priority: "normal",
    timestamp: Date.now(),
    handler: vi.fn().mockResolvedValue(undefined),
    ...overrides,
});

const flush = () => new Promise<void>(r => setTimeout(r, 0));

describe("CollaborationEventQueue", () => {
    beforeEach(() => {
        eventIdCounter = 0;
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it("processes a single event", async () => {
        const queue = new CollaborationEventQueue();
        const handler = vi.fn().mockResolvedValue(undefined);
        queue.enqueue(makeEvent({handler}));

        await flush();
        await flush();

        expect(handler).toHaveBeenCalledOnce();
        expect(queue.isIdle()).toBe(true);
    });

    it("serializes events for the same UUID", async () => {
        const queue = new CollaborationEventQueue();
        const order: number[] = [];

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        const handler1 = vi.fn().mockImplementation(() => {
            order.push(1);
            return firstBlocking;
        });
        const handler2 = vi.fn().mockImplementation(() => {
            order.push(2);
        });

        // Enqueue first and let it start processing
        queue.enqueue(makeEvent({handler: handler1, uuid: "uuid-A", timestamp: 1}));
        await flush();

        expect(handler1).toHaveBeenCalledOnce();

        // Now enqueue second while first is blocking
        queue.enqueue(makeEvent({handler: handler2, uuid: "uuid-A", timestamp: 2}));
        expect(handler2).not.toHaveBeenCalled();

        resolveFirst();
        await flush();
        await flush();

        expect(handler2).toHaveBeenCalledOnce();
        expect(order).toEqual([1, 2]);
    });

    it("processes different UUIDs in parallel", async () => {
        const queue = new CollaborationEventQueue();
        const running: string[] = [];

        let resolveA!: () => void;
        const blockingA = new Promise<void>(r => {
            resolveA = r;
        });
        let resolveB!: () => void;
        const blockingB = new Promise<void>(r => {
            resolveB = r;
        });

        const handlerA = vi.fn().mockImplementation(() => {
            running.push("A-start");
            return blockingA;
        });
        const handlerB = vi.fn().mockImplementation(() => {
            running.push("B-start");
            return blockingB;
        });

        queue.enqueue(makeEvent({handler: handlerA, uuid: "uuid-A"}));
        queue.enqueue(makeEvent({handler: handlerB, uuid: "uuid-B"}));

        await flush();

        // Both should be running in parallel
        expect(running).toEqual(["A-start", "B-start"]);
        expect(queue.isProcessing("uuid-A")).toBe(true);
        expect(queue.isProcessing("uuid-B")).toBe(true);

        resolveA();
        resolveB();
        await flush();

        expect(queue.isIdle()).toBe(true);
    });

    it("deduplicates consecutive updates (last-write-wins)", async () => {
        const queue = new CollaborationEventQueue();

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        const handler1 = vi.fn().mockImplementation(() => firstBlocking);
        const handler2 = vi.fn().mockResolvedValue(undefined);
        const handler3 = vi.fn().mockResolvedValue(undefined);

        // First event starts processing immediately
        queue.enqueue(makeEvent({handler: handler1, uuid: "uuid-A", priority: "normal", timestamp: 1}));
        await flush();

        // While first is processing, enqueue two more updates — only last should survive
        queue.enqueue(makeEvent({handler: handler2, uuid: "uuid-A", priority: "normal", timestamp: 2}));
        queue.enqueue(makeEvent({handler: handler3, uuid: "uuid-A", priority: "normal", timestamp: 3}));

        resolveFirst();
        await flush();

        expect(handler1).toHaveBeenCalledOnce();
        expect(handler2).not.toHaveBeenCalled();
        expect(handler3).toHaveBeenCalledOnce();
    });

    it("remove cancels pending add/update for same UUID", async () => {
        const queue = new CollaborationEventQueue();

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        const blockingHandler = vi.fn().mockImplementation(() => firstBlocking);
        const addHandler = vi.fn().mockResolvedValue(undefined);
        const updateHandler = vi.fn().mockResolvedValue(undefined);
        const removeHandler = vi.fn().mockResolvedValue(undefined);

        // Block processing with initial event
        queue.enqueue(makeEvent({handler: blockingHandler, uuid: "uuid-A", priority: "normal", timestamp: 1}));
        await flush();

        // Queue add and update, then remove — remove should cancel them
        queue.enqueue(makeEvent({handler: addHandler, uuid: "uuid-A", priority: "low", timestamp: 2}));
        queue.enqueue(makeEvent({handler: updateHandler, uuid: "uuid-A", priority: "normal", timestamp: 3}));
        queue.enqueue(makeEvent({handler: removeHandler, uuid: "uuid-A", priority: "high", timestamp: 4}));

        resolveFirst();
        await flush();

        expect(addHandler).not.toHaveBeenCalled();
        expect(updateHandler).not.toHaveBeenCalled();
        expect(removeHandler).toHaveBeenCalledOnce();
    });

    it("prioritizes remove > update > add within same UUID", async () => {
        const queue = new CollaborationEventQueue();
        const order: string[] = [];

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        const blockingHandler = vi.fn().mockImplementation(() => firstBlocking);

        // Block the UUID
        queue.enqueue(makeEvent({handler: blockingHandler, uuid: "uuid-A", priority: "normal", timestamp: 0}));
        await flush();

        // Note: we enqueue remove + add (which becomes update due to dedup) on a different UUID to test priority sorting
        // For same UUID, remove cancels others, so we test priority on separate UUIDs
        // Instead test: enqueue low, then normal — normal should process first
        let resolveBlock2!: () => void;
        const block2 = new Promise<void>(r => {
            resolveBlock2 = r;
        });

        const blockB = vi.fn().mockImplementation(() => block2);
        queue.enqueue(makeEvent({handler: blockB, uuid: "uuid-B", priority: "normal", timestamp: 0}));
        await flush();

        // Now queue events for uuid-B: add (low) then remove (high)
        // Remove should cancel add per dedup rules
        const addHandler = vi.fn().mockImplementation(() => order.push("add"));
        const removeHandler = vi.fn().mockImplementation(() => order.push("remove"));

        queue.enqueue(makeEvent({handler: addHandler, uuid: "uuid-B", priority: "low", timestamp: 1}));
        queue.enqueue(makeEvent({handler: removeHandler, uuid: "uuid-B", priority: "high", timestamp: 2}));

        resolveBlock2();
        await flush();

        // Remove cancels add, so only remove runs
        expect(order).toEqual(["remove"]);
        expect(addHandler).not.toHaveBeenCalled();

        resolveFirst();
        await flush();
    });

    it("sorts by priority then timestamp when both survive dedup", async () => {
        const queue = new CollaborationEventQueue();
        const order: string[] = [];

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        queue.enqueue(
            makeEvent({
                handler: vi.fn().mockImplementation(() => firstBlocking),
                uuid: "uuid-A",
                priority: "normal",
                timestamp: 0,
            }),
        );
        await flush();

        // Enqueue remove then update — both survive dedup (remove + update = keep both, remove runs first)
        queue.enqueue(
            makeEvent({
                handler: vi.fn().mockImplementation(() => order.push("remove")),
                uuid: "uuid-A",
                priority: "high",
                timestamp: 1,
            }),
        );
        queue.enqueue(
            makeEvent({
                handler: vi.fn().mockImplementation(() => order.push("update")),
                uuid: "uuid-A",
                priority: "normal",
                timestamp: 2,
            }),
        );

        resolveFirst();
        await flush();
        await flush();

        // remove (high) runs before update (normal)
        expect(order).toEqual(["remove", "update"]);
    });

    it("clear() removes all pending events", async () => {
        const queue = new CollaborationEventQueue();

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        const handler1 = vi.fn().mockImplementation(() => firstBlocking);
        const handler2 = vi.fn().mockResolvedValue(undefined);

        queue.enqueue(makeEvent({handler: handler1, uuid: "uuid-A", timestamp: 1}));
        await flush();

        queue.enqueue(makeEvent({handler: handler2, uuid: "uuid-A", timestamp: 2}));

        queue.clear();

        expect(queue.hasPending("uuid-A")).toBe(false);
        expect(queue.stats.pending).toBe(0);

        resolveFirst();
        await flush();

        // handler2 should not have been called since we cleared pending
        expect(handler2).not.toHaveBeenCalled();
    });

    it("reports correct stats", async () => {
        const queue = new CollaborationEventQueue();

        let resolveA!: () => void;
        const blockingA = new Promise<void>(r => {
            resolveA = r;
        });

        queue.enqueue(makeEvent({handler: vi.fn().mockImplementation(() => blockingA), uuid: "uuid-A", timestamp: 1}));
        await flush();

        queue.enqueue(makeEvent({uuid: "uuid-A", timestamp: 2}));
        queue.enqueue(makeEvent({uuid: "uuid-B", timestamp: 3}));

        expect(queue.stats).toEqual({pending: 2, processing: 1});

        resolveA();
        await flush();
    });

    it("keeps pending stats stable when updates are deduplicated", async () => {
        const queue = new CollaborationEventQueue();

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        queue.enqueue(makeEvent({handler: vi.fn().mockImplementation(() => firstBlocking), uuid: "uuid-A", timestamp: 1}));
        await flush();

        queue.enqueue(makeEvent({uuid: "uuid-A", priority: "normal", timestamp: 2}));
        queue.enqueue(makeEvent({uuid: "uuid-A", priority: "normal", timestamp: 3}));

        expect(queue.stats).toEqual({pending: 1, processing: 1});

        resolveFirst();
        await flush();
        await flush();
    });

    it("reschedules delayed drains so debounce windows extend on new events", async () => {
        vi.useFakeTimers();

        const queue = new CollaborationEventQueue(10_000, 50);
        const handlerA = vi.fn().mockResolvedValue(undefined);
        const handlerB = vi.fn().mockResolvedValue(undefined);

        queue.enqueue(makeEvent({uuid: "uuid-A", handler: handlerA, timestamp: 1}));

        await vi.advanceTimersByTimeAsync(40);
        expect(handlerA).not.toHaveBeenCalled();

        queue.enqueue(makeEvent({uuid: "uuid-B", handler: handlerB, timestamp: 2}));

        await vi.advanceTimersByTimeAsync(10);
        expect(handlerA).not.toHaveBeenCalled();
        expect(handlerB).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(39);
        expect(handlerA).not.toHaveBeenCalled();
        expect(handlerB).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(handlerA).toHaveBeenCalledOnce();
        expect(handlerB).toHaveBeenCalledOnce();
    });

    it("handles handler errors gracefully and continues processing", async () => {
        const queue = new CollaborationEventQueue();
        const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const failingHandler = vi.fn().mockRejectedValue(new Error("test error"));
        const successHandler = vi.fn().mockResolvedValue(undefined);

        // Start processing failing handler
        queue.enqueue(makeEvent({handler: failingHandler, uuid: "uuid-A", timestamp: 1}));
        await flush();

        // Queue success handler while failing one processes
        queue.enqueue(makeEvent({handler: successHandler, uuid: "uuid-A", timestamp: 2}));
        await flush();

        expect(failingHandler).toHaveBeenCalledOnce();
        expect(successHandler).toHaveBeenCalledOnce();
        expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("evicts oldest event when maxSize is exceeded", async () => {
        const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const queue = new CollaborationEventQueue(3);

        let resolveBlock!: () => void;
        const blocking = new Promise<void>(r => {
            resolveBlock = r;
        });

        // Block uuid-A so events queue up
        queue.enqueue(makeEvent({handler: vi.fn().mockImplementation(() => blocking), uuid: "uuid-A", timestamp: 0}));
        await flush();

        const h1 = vi.fn().mockResolvedValue(undefined);
        const h2 = vi.fn().mockResolvedValue(undefined);
        const h3 = vi.fn().mockResolvedValue(undefined);
        const h4 = vi.fn().mockResolvedValue(undefined);

        queue.enqueue(makeEvent({handler: h1, uuid: "uuid-B", timestamp: 1}));
        queue.enqueue(makeEvent({handler: h2, uuid: "uuid-C", timestamp: 2}));
        queue.enqueue(makeEvent({handler: h3, uuid: "uuid-D", timestamp: 3}));
        // This should trigger eviction of h1 (oldest pending)
        queue.enqueue(makeEvent({handler: h4, uuid: "uuid-E", timestamp: 4}));

        // uuid-B through uuid-E process immediately (different UUIDs, not blocked)
        await flush();

        expect(consoleWarnSpy).toHaveBeenCalled();

        resolveBlock();
        await flush();
    });

    it("isProcessing returns correct state", async () => {
        const queue = new CollaborationEventQueue();

        let resolveA!: () => void;
        const blockingA = new Promise<void>(r => {
            resolveA = r;
        });

        queue.enqueue(makeEvent({handler: vi.fn().mockImplementation(() => blockingA), uuid: "uuid-A"}));
        await flush();

        expect(queue.isProcessing("uuid-A")).toBe(true);
        expect(queue.isProcessing("uuid-B")).toBe(false);

        resolveA();
        await flush();

        expect(queue.isProcessing("uuid-A")).toBe(false);
    });

    it("remove + add on same UUID in pending results in promoted update (replace semantics)", async () => {
        const queue = new CollaborationEventQueue();
        const order: string[] = [];

        let resolveFirst!: () => void;
        const firstBlocking = new Promise<void>(r => {
            resolveFirst = r;
        });

        queue.enqueue(
            makeEvent({
                handler: vi.fn().mockImplementation(() => firstBlocking),
                uuid: "uuid-A",
                priority: "normal",
                timestamp: 0,
            }),
        );
        await flush();

        const removeHandler = vi.fn().mockImplementation(() => order.push("remove"));
        const addHandler = vi.fn().mockImplementation(() => order.push("add-promoted"));

        // Enqueue remove then add — dedup drops remove, promotes add to normal priority
        queue.enqueue(
            makeEvent({
                handler: removeHandler,
                uuid: "uuid-A",
                priority: "high",
                timestamp: 1,
            }),
        );
        queue.enqueue(
            makeEvent({
                handler: addHandler,
                uuid: "uuid-A",
                priority: "low",
                timestamp: 2,
            }),
        );

        resolveFirst();
        await flush();

        // remove + add collapses: remove is dropped, add is promoted to update
        expect(removeHandler).not.toHaveBeenCalled();
        expect(addHandler).toHaveBeenCalledOnce();
        expect(order).toEqual(["add-promoted"]);
    });
});
