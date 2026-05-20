import type EngineRuntime from "@stem/editor-oss/EngineRuntime";
import { DetectDevice } from "@stem/editor-oss/utils/DetectDevice";
import { AiWorldSystemAdapter } from "./adapters/AiWorldSystemAdapter";
import { AnimationGraphSystemAdapter } from "./adapters/AnimationGraphSystemAdapter";
import { AnimationSystemAdapter } from "./adapters/AnimationSystemAdapter";
import { AudioSystemAdapter } from "./adapters/AudioSystemAdapter";
import { BehaviorSystemAdapter } from "./adapters/BehaviorSystemAdapter";
import { CollisionSystemAdapter } from "./adapters/CollisionSystemAdapter";
import { FixedBehaviorSystemAdapter } from "./adapters/FixedBehaviorSystemAdapter";
import { FixedLambdaSystemAdapter } from "./adapters/FixedLambdaSystemAdapter";
import { InputSystemAdapter } from "./adapters/InputSystemAdapter";
import { LambdaSystemAdapter } from "./adapters/LambdaSystemAdapter";
import { ObjectPickerSystemAdapter } from "./adapters/ObjectPickerSystemAdapter";
import { PhysicsSystemAdapter } from "./adapters/PhysicsSystemAdapter";
import { PlotBudgetSystemAdapter } from "./adapters/PlotBudgetSystemAdapter";
import { PlayerEventAdapter } from "./adapters/PlayerEventAdapter";
import { QualitySystemAdapter } from "./adapters/QualitySystemAdapter";
import { RenderSystemAdapter } from "./adapters/RenderSystemAdapter";
import { RuntimeBudgetSystemAdapter } from "./adapters/RuntimeBudgetSystemAdapter";
import { TextureResidencySystemAdapter } from "./adapters/TextureResidencySystemAdapter";
import { TweenSystemAdapter } from "./adapters/TweenSystemAdapter";
import { SpatialGridSystem } from "./adapters/SpatialGridSystem";
import { recordFrameRuntimeTrace } from "./debug/frameRuntimeTrace.js";
import { FrameOrchestrator, type RenderPressurePolicy } from "./FrameOrchestrator";
import { UniformSpatialGrid } from "./spatial/UniformSpatialGrid";
import type { IQualitySettings } from "@stem/editor-oss/core/quality/interfaces/IQualityManager";
import { configurePlotBudgetManagerFromEngine } from "@stem/editor-oss/core/budget/PlotBudgetPolicy";
import { configureRuntimeBudgetCoordinatorFromEngine } from "@stem/editor-oss/core/budget/RuntimeBudgetCoordinator";
import { configureTextureResidencyManagerFromEngine } from "@stem/editor-oss/core/budget/TextureResidencyPolicy";

export interface SchedulerBundle {
    orchestrator: FrameOrchestrator;
    spatialGrid: UniformSpatialGrid;
}

export interface SchedulerCreationOptions {
    enableFixedRateUpdates?: boolean;
    scheduleRender?: boolean;
}

/**
 * Factory that creates a fully-wired FrameOrchestrator from quality settings.
 * All references are resolved lazily via getter lambdas so the factory can
 * run before subsystems (physics, behaviors, etc.) are fully initialised.
 * @param engine
 * @param config
 * @param options
 */
export function createSchedulerFromConfig(
    engine: EngineRuntime,
    config: IQualitySettings["scheduler"],
    options: SchedulerCreationOptions = {},
): SchedulerBundle {
    const enableFixedRateUpdates = options.enableFixedRateUpdates ?? true;
    const renderTargetFPS = DetectDevice.isMobile() ? 30 : 60;

    const orchestrator = new FrameOrchestrator({
        targetFPS: renderTargetFPS,
        frameBudgetMs: config.frameBudgetMs,
        fixedTimestepMs: 1000 / config.fixedTimestepHz,
        maxFixedStepsPerFrame: config.maxFixedStepsPerFrame,
        enableTimeSlicing: config.enableTimeSlicing,
        scheduleRender: options.scheduleRender ?? false,
        renderPressureThreshold: config.renderPressureThreshold,
        deltaTimePressureThreshold: config.deltaTimePressureThreshold,
        fixedUpdatesEnabled: enableFixedRateUpdates,
    });

    const renderPressurePolicy = (engine as unknown as {
        qualitySystem?: { createRenderPressurePolicy?: () => RenderPressurePolicy };
    }).qualitySystem?.createRenderPressurePolicy?.();
    if (renderPressurePolicy) {
        orchestrator.setRenderPressurePolicy(renderPressurePolicy);
    }

    const spatialGrid = new UniformSpatialGrid(config.spatialGridCellSize);
    orchestrator.setSpatialGrid(spatialGrid);

    // --- Register adapters (getter lambdas defer resolution) ---

    orchestrator.registerSystem(
        new InputSystemAdapter(() => engine.game?.inputManager ?? undefined),
    );

    orchestrator.registerSystem(
        new QualitySystemAdapter(() => {
            const qs = (engine as any).qualitySystem;
            return qs ?? undefined;
        }),
    );

    orchestrator.registerSystem(
        new SpatialGridSystem(() => engine.game?.getTrackedObjects() ?? new Map()),
    );

    orchestrator.registerSystem(
        new RuntimeBudgetSystemAdapter(
            () => engine.game?.runtimeBudgetCoordinator,
            () => engine.game?.textureResidencyManager,
            coordinator => configureRuntimeBudgetCoordinatorFromEngine(coordinator, engine),
        ),
    );

    orchestrator.registerSystem(
        new PlotBudgetSystemAdapter(
            () => engine.game?.plotBudgetManager,
            () => engine.game?.camera,
            manager => configurePlotBudgetManagerFromEngine(manager, engine),
        ),
    );

    orchestrator.registerSystem(
        new PhysicsSystemAdapter(() => {
            const p = engine.physics;
            if (!p) return undefined;
            // Wrap PlayerPhysics2.update() as IPhysics.simulate()
            return { simulate: (dt: number) => p.update(dt) } as any;
        }),
    );

    orchestrator.registerSystem(
        new CollisionSystemAdapter(() => engine.game?.collisionDetector ?? undefined),
    );

    orchestrator.registerSystem(
        new TweenSystemAdapter(() => engine.game?.tweenGroupRef ?? undefined),
    );

    orchestrator.registerSystem(
        new BehaviorSystemAdapter(() => engine.game?.behaviorManager ?? undefined),
    );

    if (enableFixedRateUpdates) {
        // Fixed timestep behaviors (runs in FIXED_UPDATE stage)
        // Behaviors implementing fixedUpdate() are called at scheduler.fixedTimestepHz rate
        orchestrator.registerSystem(
            new FixedBehaviorSystemAdapter(() => engine.game?.behaviorManager ?? undefined),
        );

        // Fixed timestep lambdas (runs in FIXED_UPDATE stage after behaviors)
        // Lambdas implementing fixedUpdate() are called at scheduler.fixedTimestepHz rate
        orchestrator.registerSystem(
            new FixedLambdaSystemAdapter(() => engine.game?.lambdaManager ?? undefined),
        );
    }

    orchestrator.registerSystem(
        new ObjectPickerSystemAdapter(() => engine.game?.objectPicker ?? undefined),
    );

    orchestrator.registerSystem(
        new LambdaSystemAdapter(() => engine.game?.lambdaManager ?? undefined),
    );

    orchestrator.registerSystem(
        new AnimationSystemAdapter(() => engine.animationControl ?? undefined),
    );

    orchestrator.registerSystem(
        new AnimationGraphSystemAdapter(
            () => engine.animationGraphControl ?? undefined,
            () => (engine as any).clock,
        ),
    );

    orchestrator.registerSystem(
        new AudioSystemAdapter(() => engine.audioControl ?? undefined),
    );

    orchestrator.registerSystem(
        new AiWorldSystemAdapter(
            () => engine.aiWorldControl ?? undefined,
            () => (engine as any).clock,
        ),
    );

    orchestrator.registerSystem(
        new PlayerEventAdapter(
            () => engine.playerEvent ?? undefined,
        ),
    );

    orchestrator.registerSystem(
        new TextureResidencySystemAdapter(
            () => engine.game?.textureResidencyManager,
            manager => configureTextureResidencyManagerFromEngine(manager, engine),
        ),
    );

    if (options.scheduleRender) {
        orchestrator.registerSystem(
            new RenderSystemAdapter(
                () => (clock, deltaTime) => engine.runScheduledRender(clock, deltaTime),
                () => (engine as any).clock
            ),
        );
    }

    // Wire spatial grid into LambdaScheduler for O(1) distance lookups
    if (engine.game?.lambdaManager?.scheduler) {
        engine.game.lambdaManager.scheduler.setSpatialGrid(spatialGrid);
    }

    console.debug(
        `[Scheduler] Created FrameOrchestrator (budget=${config.frameBudgetMs}ms, ` +
        `fixed=${config.fixedTimestepHz}Hz, target=${renderTargetFPS}fps, timeSlicing=${config.enableTimeSlicing}, ` +
        `fixedRateUpdates=${enableFixedRateUpdates}, ` +
        `scheduleRender=${options.scheduleRender ?? false})`,
    );
    recordFrameRuntimeTrace({
        kind: "scheduler-init",
        frameBudgetMs: config.frameBudgetMs,
        fixedTimestepHz: config.fixedTimestepHz,
        maxFixedStepsPerFrame: config.maxFixedStepsPerFrame,
        enableTimeSlicing: config.enableTimeSlicing,
        fixedRateUpdates: enableFixedRateUpdates,
        scheduleRender: options.scheduleRender ?? false,
        renderTargetFPS,
        renderPressureThreshold: config.renderPressureThreshold,
        deltaTimePressureThreshold: config.deltaTimePressureThreshold,
    });

    return { orchestrator, spatialGrid };
}
