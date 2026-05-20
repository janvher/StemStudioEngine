import global from "@stem/editor-oss/global";
import { DiscordController } from "../userManagement/playerProfile/game-service-controllers";
import { DetectDevice } from "@stem/editor-oss/utils/DetectDevice";
import { PhysicsEngineType } from "./common/types";
import { PhysicsEngineFactory } from "./PhysicsEngineFactory";

/**
 * Decide whether play-mode physics should run inside the dedicated physics
 * worker. This must produce the same answer at preload time as at
 * `PlayerPhysics2.physicsCreate` time, otherwise we'd preload a worker that
 * the eventual run never adopts.
 *
 * Mirrors the conditions in `PlayerPhysics2`: env-level support gates from the
 * constructor plus the `os !== Windows` check from the create branch. The
 * `isMultiplayer && useMultiplayerPhysicsEngine` branch in `physicsCreate` is
 * currently unreachable (the flag is never set true), so it isn't a factor
 * here — revisit if that flag becomes live.
 *
 * @returns true if the worker path will be taken
 */
export const shouldUsePhysicsWorker = (): boolean => {
    if (typeof Worker === "undefined") return false;
    if (DetectDevice.getOS() === "Windows") return false;
    if (global.app?.debug) return false;
    if (DiscordController.isInDiscord() && process.env.NODE_ENV !== "production") return false;
    return true;
};

/**
 * Start fetching/initializing the physics engine WASM as early as possible,
 * routing to the worker realm when applicable. Errors are logged but never
 * thrown — preload failure must not break scene load. The eventual
 * `PhysicsProxy.start()` / `physics.create()` will surface real errors.
 *
 * @param engineType which engine to preload (Ammo / Rapier / Jolt / PhysX)
 * @param gravity gravity to feed the worker's START message (ignored on the
 *   main-thread path, since `PhysicsEngineFactory.preload` doesn't take it)
 */
export const preloadPhysics = (
    engineType: PhysicsEngineType,
    gravity: number,
): void => {
    if (shouldUsePhysicsWorker()) {
        PhysicsEngineFactory.preloadWorker(engineType, gravity);
        return;
    }
    PhysicsEngineFactory.preload(engineType).catch((err) =>
        console.warn("preloadPhysics: main-thread preload failed", err),
    );
};
