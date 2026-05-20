import { describe, it, expect, vi, beforeEach } from "vitest";

import { LoadingManager, LoadingMessages } from "./LoadingManager";

describe("LoadingManager", () => {
    let mockApp: { call: (event: string, ...args: unknown[]) => void };
    let mockCall: ReturnType<typeof vi.fn>;
    let manager: LoadingManager;

    beforeEach(() => {
        mockCall = vi.fn();
        mockApp = { call: mockCall as (event: string, ...args: unknown[]) => void };
        manager = new LoadingManager(mockApp);
    });

    describe("startLoading", () => {
        it("should initialize with default stages", () => {
            manager.startLoading();
            expect(manager.getProgress()).toBe(0);
            expect(manager.getCurrentMessage()).toBe(LoadingMessages.INITIALIZING);
        });

        it("should initialize with custom stages", () => {
            manager.startLoading([
                { name: "a", message: LoadingMessages.LOADING_SCENE, weight: 0.5 },
                { name: "b", message: LoadingMessages.FINALIZING, weight: 0.5 },
            ]);
            expect(manager.getProgress()).toBe(0);
            expect(manager.getCurrentMessage()).toBe(LoadingMessages.LOADING_SCENE);
        });

        it("should fire loadingStatus event on start", () => {
            manager.startLoading();
            expect(mockCall).toHaveBeenCalledWith(
                "loadingStatus",
                expect.anything(),
                expect.objectContaining({ progress: 0, stage: "init" }),
            );
        });
    });

    describe("nextStage", () => {
        it("should advance to the next stage", () => {
            manager.startLoading();
            manager.nextStage();
            // First stage (init, weight=0.1) complete → progress = 10%
            expect(manager.getProgress()).toBeGreaterThan(0);
        });

        it("should accept an optional message override", () => {
            manager.startLoading();
            manager.nextStage(LoadingMessages.CREATING_OBJECTS);
            expect(manager.getCurrentMessage()).toBe(LoadingMessages.CREATING_OBJECTS);
        });

        it("should not throw when called without starting", () => {
            expect(() => manager.nextStage()).not.toThrow();
        });
    });

    describe("updateStageProgress", () => {
        it("should update progress within a stage", () => {
            manager.startLoading([
                { name: "a", message: LoadingMessages.LOADING_SCENE, weight: 1.0 },
            ]);
            manager.updateStageProgress(0.5);
            expect(manager.getProgress()).toBe(50);
        });

        it("should clamp progress to 0-1 range", () => {
            manager.startLoading([
                { name: "a", message: LoadingMessages.LOADING_SCENE, weight: 1.0 },
            ]);
            manager.updateStageProgress(2.0);
            expect(manager.getProgress()).toBe(100);
            manager.updateStageProgress(-1.0);
            expect(manager.getProgress()).toBe(0);
        });
    });

    describe("completeLoading", () => {
        it("should set progress to 100", () => {
            manager.startLoading();
            manager.completeLoading();
            expect(manager.getProgress()).toBe(100);
        });

        it("should fire events with 100% progress", () => {
            manager.startLoading();
            vi.clearAllMocks();
            manager.completeLoading();
            expect(mockCall).toHaveBeenCalledWith(
                "maskProgress",
                expect.anything(),
                100,
            );
        });
    });

    describe("handleError", () => {
        it("should fire event with error message", () => {
            manager.startLoading();
            vi.clearAllMocks();
            manager.handleError("Something went wrong");
            expect(mockCall).toHaveBeenCalledWith(
                "loadingStatus",
                expect.anything(),
                expect.objectContaining({ message: "Error: Something went wrong" }),
            );
        });
    });

    describe("weighted progress calculation", () => {
        it("should calculate progress based on stage weights", () => {
            manager.startLoading([
                { name: "a", message: LoadingMessages.LOADING_SCENE, weight: 0.25 },
                { name: "b", message: LoadingMessages.CREATING_OBJECTS, weight: 0.75 },
            ]);

            // Complete first stage (25% weight)
            manager.nextStage();
            expect(manager.getProgress()).toBe(25);

            // Complete second stage
            manager.nextStage();
            expect(manager.getProgress()).toBe(100);
        });
    });

    describe("duplicate stage transitions", () => {
        it("should be safe to call nextStage multiple times", () => {
            manager.startLoading([
                { name: "a", message: LoadingMessages.LOADING_SCENE, weight: 0.5 },
                { name: "b", message: LoadingMessages.FINALIZING, weight: 0.5 },
            ]);
            manager.nextStage();
            manager.nextStage();
            manager.nextStage(); // Past all stages
            expect(manager.getProgress()).toBe(100);
        });
    });

    describe("event firing", () => {
        it("should fire both loadingStatus and maskProgress events", () => {
            manager.startLoading();
            expect(mockCall).toHaveBeenCalledWith("loadingStatus", expect.anything(), expect.any(Object));
            expect(mockCall).toHaveBeenCalledWith("maskProgress", expect.anything(), expect.any(Number));
        });
    });

    describe("setApp", () => {
        it("should allow setting app after construction", () => {
            const manager2 = new LoadingManager();
            manager2.setApp(mockApp);
            manager2.startLoading();
            expect(mockCall).toHaveBeenCalled();
        });
    });

    describe("new loading messages", () => {
        it("should expose behavior and lambda loading messages", () => {
            expect(LoadingMessages.LOADING_BEHAVIORS).toBe("Loading behaviors...");
            expect(LoadingMessages.LOADING_LAMBDAS).toBe("Loading lambda system...");
            expect(LoadingMessages.INITIALIZING_BEHAVIORS).toBe("Initializing behaviors...");
            expect(LoadingMessages.INITIALIZING_LAMBDAS).toBe("Initializing lambdas...");
        });

        it("should work in custom stage definitions", () => {
            manager.startLoading([
                { name: "behaviors", message: LoadingMessages.LOADING_BEHAVIORS, weight: 0.5 },
                { name: "lambdas", message: LoadingMessages.LOADING_LAMBDAS, weight: 0.5 },
            ]);
            expect(manager.getCurrentMessage()).toBe(LoadingMessages.LOADING_BEHAVIORS);
            manager.nextStage();
            expect(manager.getCurrentMessage()).toBe(LoadingMessages.LOADING_LAMBDAS);
        });
    });
});
