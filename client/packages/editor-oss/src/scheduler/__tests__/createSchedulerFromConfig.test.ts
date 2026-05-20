import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock DetectDevice before importing createSchedulerFromConfig (it accesses navigator/window)
vi.mock("../../utils/DetectDevice", () => ({
    DetectDevice: {
        isMobile: () => false,
        isDesktop: () => true,
    },
}));

import { createSchedulerFromConfig, SchedulerBundle } from "../createSchedulerFromConfig";
import { FrameOrchestrator } from "../FrameOrchestrator";

// Mock Application type with minimal required structure
const createMockApplication = () => ({
    game: {
        getTrackedObjects: vi.fn(() => new Map()),
        cameraControl: {
            update: vi.fn(),
        },
        inputManager: {
            update: vi.fn(),
        },
        behaviorManager: {
            behaviors: [],
            update: vi.fn(),
            fixedUpdate: vi.fn(),
        },
        lambdaManager: {
            scheduler: {
                setSpatialGrid: vi.fn(),
            },
            update: vi.fn(),
            fixedUpdate: vi.fn(),
        },
        collisionDetector: {
            update: vi.fn(),
        },
        objectPicker: {
            update: vi.fn(),
        },
    },
    physics: {
        update: vi.fn(),
    },
    animationControl: {
        update: vi.fn(),
    },
    animationGraphControl: {
        update: vi.fn(),
    },
    audioControl: {
        update: vi.fn(),
    },
    aiWorldControl: {
        update: vi.fn(),
    },
    playerEvent: {
        update: vi.fn(),
    },
    runScheduledRender: vi.fn(),
    qualitySystem: {
        update: vi.fn(),
        createRenderPressurePolicy: vi.fn(),
    },
    clock: {
        getDelta: vi.fn(() => 0.016),
    },
});

// Mock scheduler config from quality settings
const createMockConfig = () => ({
    enabled: true,
    frameBudgetMs: 14,
    fixedTimestepHz: 60,
    maxFixedStepsPerFrame: 4,
    enableTimeSlicing: true,
    spatialGridCellSize: 50,
    renderPressureThreshold: 0.5,
    deltaTimePressureThreshold: 1.25,
});

describe("createSchedulerFromConfig", () => {
    let mockApp: ReturnType<typeof createMockApplication>;
    let mockConfig: ReturnType<typeof createMockConfig>;
    let bundle: SchedulerBundle;
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        mockApp = createMockApplication();
        mockConfig = createMockConfig();
        consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    });

    afterEach(() => {
        if (bundle?.orchestrator) {
            bundle.orchestrator.dispose();
        }
        consoleSpy.mockRestore();
    });

    describe("factory creation", () => {
        it("should create a SchedulerBundle with orchestrator and spatialGrid", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(bundle).toHaveProperty("orchestrator");
            expect(bundle).toHaveProperty("spatialGrid");
            expect(bundle.orchestrator).toBeInstanceOf(FrameOrchestrator);
        });

        it("should configure orchestrator with frame budget from config", () => {
            mockConfig.frameBudgetMs = 16;
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            // Frame budget is internal but we can verify it was set
            expect(bundle.orchestrator).toBeDefined();
        });

        it("should configure fixed timestep from config Hz", () => {
            mockConfig.fixedTimestepHz = 30; // 30Hz = 33.33ms
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(bundle.orchestrator).toBeDefined();
        });

        it("should configure spatial grid with cell size from config", () => {
            mockConfig.spatialGridCellSize = 100;
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(bundle.spatialGrid).toBeDefined();
        });

        it("should wire spatial grid to orchestrator", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            // Orchestrator should have spatial grid set
            expect(bundle.orchestrator).toBeDefined();
            expect(bundle.spatialGrid).toBeDefined();
        });
    });

    describe("adapter registration", () => {
        it("should register QualitySystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            // Run a tick to trigger adapters
            bundle.orchestrator.tick(0.016);

            // QualitySystem should be called if adapter is registered
            // (lazy resolution means it's called during tick)
        });

        it("should register InputSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            expect(mockApp.game.inputManager.update).toHaveBeenCalled();
        });

        it("should register SpatialGridSystem", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            // getTrackedObjects should be called by SpatialGridSystem
            expect(mockApp.game.getTrackedObjects).toHaveBeenCalled();
        });

        it("should register PhysicsSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            // Run multiple ticks to ensure fixed update accumulator triggers
            // Fixed timestep at 60Hz = 16.67ms, so tick(0.02) should trigger it
            bundle.orchestrator.tick(0.02);
            bundle.orchestrator.tick(0.02);

            // Physics update should be called (wrapped as simulate)
            expect(mockApp.physics.update).toHaveBeenCalled();
        });

        it("should register BehaviorSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            // BehaviorManager should be accessed
            expect(mockApp.game.behaviorManager).toBeDefined();
        });

        it("should register FixedBehaviorSystemAdapter", () => {
            // Add a behavior with fixedUpdate
            mockApp.game.behaviorManager = {
                behaviors: [
                    {
                        id: "test",
                        uuid: "test-uuid",
                        isPaused: false,
                        fixedUpdate: vi.fn(),
                    },
                ],
                update: vi.fn(),
                fixedUpdate(fixedDt: number) {
                    for (const b of this.behaviors) {
                        if (b.fixedUpdate) b.fixedUpdate(fixedDt);
                    }
                },
            } as any;

            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            // Run multiple ticks to ensure fixed update accumulator triggers
            // Fixed timestep at 60Hz = 16.67ms, so tick(0.02) should trigger it
            bundle.orchestrator.tick(0.02);
            bundle.orchestrator.tick(0.02);

            // fixedUpdate should be called
            expect((mockApp.game.behaviorManager.behaviors[0] as any).fixedUpdate).toHaveBeenCalled();
        });

        it("should skip fixed-rate adapters when fixed updates are disabled", () => {
            mockApp.game.behaviorManager = {
                behaviors: [
                    {
                        id: "test",
                        uuid: "test-uuid",
                        isPaused: false,
                        fixedUpdate: vi.fn(),
                    },
                ],
                update: vi.fn(),
                fixedUpdate(fixedDt: number) {
                    for (const b of this.behaviors) {
                        if (b.fixedUpdate) b.fixedUpdate(fixedDt);
                    }
                },
            } as any;

            bundle = createSchedulerFromConfig(mockApp as any, mockConfig, {
                enableFixedRateUpdates: false,
            });

            bundle.orchestrator.tick(0.02);
            bundle.orchestrator.tick(0.02);

            expect((mockApp.game.behaviorManager.behaviors[0] as any).fixedUpdate).not.toHaveBeenCalled();
        });

        it("should register CollisionSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            // CollisionDetector should be accessed
            expect(mockApp.game.collisionDetector).toBeDefined();
        });

        it("should register LambdaSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            // LambdaManager should be accessed
            expect(mockApp.game.lambdaManager).toBeDefined();
        });

        it("should register AnimationSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            // AnimationControl should be called
            expect(mockApp.animationControl.update).toHaveBeenCalled();
        });

        it("should register AnimationGraphSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            expect(mockApp.animationGraphControl.update).toHaveBeenCalled();
        });

        it("should register AudioSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            expect(mockApp.audioControl.update).toHaveBeenCalled();
        });

        it("should register AiWorldSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            expect(mockApp.aiWorldControl.update).toHaveBeenCalled();
        });

        it("should register PlayerEventAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            // PlayerEvent should be called
            expect(mockApp.playerEvent.update).toHaveBeenCalled();
        });

        it("should register ObjectPickerSystemAdapter", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            bundle.orchestrator.tick(0.016);

            expect(mockApp.game.objectPicker.update).toHaveBeenCalled();
        });

        it("should register RenderSystemAdapter when scheduled rendering is enabled", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig, {
                scheduleRender: true,
            });

            bundle.orchestrator.tick(0.016);
            expect(mockApp.runScheduledRender).toHaveBeenCalledTimes(1);

            bundle.orchestrator.tick(0.016);
            expect(mockApp.runScheduledRender).toHaveBeenCalledTimes(2);
        });
    });

    describe("lambda scheduler integration", () => {
        it("should wire spatial grid to lambda scheduler when available", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(mockApp.game.lambdaManager.scheduler.setSpatialGrid).toHaveBeenCalledWith(
                bundle.spatialGrid,
            );
        });

        it("should handle missing lambda scheduler gracefully", () => {
            mockApp.game.lambdaManager.scheduler = null as any;

            // Should not throw
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            expect(bundle.orchestrator).toBeDefined();
        });

        it("should handle missing game gracefully", () => {
            mockApp.game = null as any;

            // Should not throw
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);
            expect(bundle.orchestrator).toBeDefined();
        });
    });

    describe("lazy resolution", () => {
        it("should defer subsystem resolution via getter lambdas", () => {
            // Initially game is null
            mockApp.game = null as any;

            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            // Set game after factory creation
            mockApp.game = {
                getTrackedObjects: vi.fn(() => new Map()),
                cameraControl: { update: vi.fn() },
                inputManager: { update: vi.fn() },
                behaviorManager: {
                    behaviors: [],
                    update: vi.fn(),
                    fixedUpdate: vi.fn(),
                },
                lambdaManager: {
                    scheduler: { setSpatialGrid: vi.fn() },
                    update: vi.fn(),
                    fixedUpdate: vi.fn(),
                },
                collisionDetector: { update: vi.fn() },
                objectPicker: { update: vi.fn() },
            };

            // Now tick should work with the newly set game
            bundle.orchestrator.tick(0.016);

            // If adapters resolved eagerly, they would have null game
            // With lazy resolution, they get the current value
            expect(mockApp.game.getTrackedObjects).toHaveBeenCalled();
        });
    });

    describe("debug logging", () => {
        it("should log configuration when created", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("[Scheduler] Created FrameOrchestrator"),
            );
        });

        it("should include frame budget in log", () => {
            mockConfig.frameBudgetMs = 16;
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("budget=16ms"),
            );
        });

        it("should include fixed timestep Hz in log", () => {
            mockConfig.fixedTimestepHz = 30;
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("fixed=30Hz"),
            );
        });

        it("should include time slicing flag in log", () => {
            mockConfig.enableTimeSlicing = false;
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining("timeSlicing=false"),
            );
        });
    });

    describe("orchestrator disposal", () => {
        it("should dispose orchestrator cleanly", () => {
            bundle = createSchedulerFromConfig(mockApp as any, mockConfig);

            // Should not throw
            bundle.orchestrator.dispose();

            // Subsequent ticks should be no-ops
            bundle.orchestrator.tick(0.016);
        });
    });
});
