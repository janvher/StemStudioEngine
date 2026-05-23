/**
 * UIKit Pointer Events Integration
 *
 * This utility provides lazy initialization of the @pmndrs/pointer-events system.
 * The pointer events system is only active when at least one UIKit root exists,
 * avoiding performance overhead when UIKit is not being used.
 *
 * Reference counting ensures multiple behaviors can safely use this system:
 * - initialize() increments ref count, deinitialize() decrements it
 * - Pointer events only start when first root is registered
 * - Pointer events only stop when last root is unregistered
 * - Full cleanup only happens when ref count reaches 0 AND no roots exist
 *
 * Usage in behavior scripts:
 * ```javascript
 * // In init():
 * UIKitPointerEvents.initialize(game);
 *
 * // Create UI:
 * const ui = new UIKit.Container({ width: 200, height: 100 });
 * this.target.add(ui);
 * UIKitPointerEvents.registerRoot(ui);
 *
 * // In update():
 * UIKitPointerEvents.update(deltaTime);
 *
 * // In dispose():
 * UIKitPointerEvents.unregisterRoot(ui);
 * ui.dispose();
 * UIKitPointerEvents.deinitialize();
 * ```
 */

import {reversePainterSortStable} from "@ni2khanna/uikit";
import {forwardHtmlEvents} from "@pmndrs/pointer-events";
import type {Camera, OrthographicCamera, PerspectiveCamera, Scene} from "three";

// UIKit Component interface (minimal typing for what we need)
interface UIKitComponent {
    update: (delta: number) => void;
    dispose: () => void;
    removeFromParent?: () => void;
}

interface GameManagerLike {
    scene?: Scene;
    camera?: Camera;
    uiCamera?: Camera;
    renderer?: {
        domElement?: HTMLCanvasElement;
        setTransparentSort?: (method: (a: unknown, b: unknown) => number) => void;
    };
}

function asUIKitCamera(camera: Camera | undefined): PerspectiveCamera | OrthographicCamera | undefined {
    if (!camera) return undefined;
    const c = camera as PerspectiveCamera | OrthographicCamera;
    return "isPerspectiveCamera" in c || "isOrthographicCamera" in c ? c : undefined;
}

interface PointerEventsInstance {
    update: () => void;
    destroy: () => void;
}

// Singleton state
let pointerEventsInstance: PointerEventsInstance | null = null;
let gameRef: GameManagerLike | null = null;
let initRefCount = 0;
const activeRoots = new Set<UIKitComponent>();
let hasConfiguredTransparentSort = false;

/**
 * Ensures UIKit transparent objects use stable painter sorting.
 *
 * @param game - The GameManager-like runtime object containing renderer.
 * @returns void
 */
function ensureTransparentSort(game: GameManagerLike): void {
    if (hasConfiguredTransparentSort) {
        return;
    }

    const renderer = game.renderer;

    if (!renderer?.setTransparentSort) {
        return;
    }

    renderer.setTransparentSort(reversePainterSortStable as (a: unknown, b: unknown) => number);
    hasConfiguredTransparentSort = true;
}

/**
 * Initializes the module with a GameManager reference.
 * Call this once in your behavior's init() before creating any UIKit components.
 * Reference counted - each initialize() should be paired with a deinitialize().
 *
 * @param game - The GameManager instance
 */
export function initialize(game: GameManagerLike): void {
    initRefCount++;

    ensureTransparentSort(game);

    // Only set gameRef on first init, or if it was cleared
    if (!gameRef) {
        gameRef = game;
    }
}

/**
 * Decrements the initialization reference count.
 * Call this in your behavior's dispose() after unregistering all roots.
 * The system fully cleans up when ref count reaches 0 AND no roots exist.
 */
export function deinitialize(): void {
    if (initRefCount > 0) {
        initRefCount--;
    }

    // Full cleanup only when no more references AND no active roots
    if (initRefCount === 0 && activeRoots.size === 0) {
        cleanupPointerEvents();
        gameRef = null;
    }
}

/**
 * Registers a UIKit component as a root (a component whose parent is not UIKit).
 * Automatically enables pointer events when the first root is registered.
 *
 * @param component - The UIKit component (Container, Fullscreen, etc.)
 */
export function registerRoot(component: UIKitComponent): void {
    activeRoots.add(component);

    // Initialize pointer events if this is the first root
    if (activeRoots.size === 1 && !pointerEventsInstance && gameRef) {
        initializePointerEvents();
    }

    // Force a synchronous first update so `Fullscreen` populates its
    // `sizeX/sizeY/pixelSize` signals from the parent camera + renderer.
    // Without this, any child added during the behavior's `init()` lays
    // out against `sizeX = 0` (the constructor default), so percentage
    // widths resolve to 0 and yoga measures text with width=0 — every
    // word ends up on its own line. The next behavior tick would update
    // dimensions, but yoga's text-measure cache and the timing of the
    // editor → play transition combine to leave that initial broken
    // layout pinned on the first play after a fresh import. A redundant
    // update on a stable root is harmless; the regular `update()` call
    // in the per-frame `UIKitPointerEvents.update` continues to handle
    // subsequent dimension changes.
    try {
        component.update(0);
    } catch (err) {
        // Fullscreen.update throws if the component isn't parented to a
        // camera yet. Helpers attach BEFORE calling registerRoot, so this
        // shouldn't happen in practice — but if a caller registers a
        // detached root, just skip the synchronous warm-up and let the
        // first per-frame update populate dimensions later.
        console.debug("[UIKitPointerEvents] registerRoot warm-up update skipped", err);
    }
}

/**
 * Unregisters a UIKit root component.
 * Disables pointer events when the last root is unregistered.
 *
 * @param component - The UIKit component to unregister
 */
export function unregisterRoot(component: UIKitComponent): void {
    if (!activeRoots.has(component)) {
        return;
    }

    activeRoots.delete(component);

    // Clean up pointer events if no roots remain
    if (activeRoots.size === 0) {
        cleanupPointerEvents();

        // If no more init references either, clear gameRef
        if (initRefCount === 0) {
            gameRef = null;
        }
    }
}

/**
 * Updates all registered UIKit roots and processes pointer events.
 * Call this in your behavior's update() loop.
 * Safe to call even when no roots exist (no-op).
 *
 * @param deltaTime - Time since last frame in seconds
 */
export function update(deltaTime: number = 0): void {
    // Update pointer events system
    if (pointerEventsInstance) {
        pointerEventsInstance.update();
    }

    // Update all UIKit roots
    for (const root of activeRoots) {
        root.update(deltaTime);
    }
}

/**
 * Force cleanup of all roots and the pointer events system.
 * Use sparingly - prefer deinitialize() for normal cleanup.
 * This bypasses reference counting and immediately cleans everything.
 */
export function forceDispose(): void {
    for (const root of activeRoots) {
        try {
            root.removeFromParent?.();
        } catch (error) {
            console.warn("UIKitPointerEvents.forceDispose: Failed to remove root from parent", error);
        }

        try {
            root.dispose?.();
        } catch (error) {
            console.warn("UIKitPointerEvents.forceDispose: Failed to dispose root", error);
        }
    }

    activeRoots.clear();
    cleanupPointerEvents();
    gameRef = null;
    initRefCount = 0;
    hasConfiguredTransparentSort = false;
}

/**
 * Returns whether the pointer events system is currently active.
 * @returns True when pointer events instance exists and at least one root is active.
 */
export function isActive(): boolean {
    return pointerEventsInstance !== null && activeRoots.size > 0;
}

/**
 * Returns the number of active UIKit roots.
 * @returns Number of currently registered UIKit roots.
 */
export function getRootCount(): number {
    return activeRoots.size;
}

/**
 * Returns the current initialization reference count.
 * @returns Current initialize/deinitialize reference count.
 */
export function getInitRefCount(): number {
    return initRefCount;
}

/**
 * Returns whether the system is initialized (has game reference).
 * @returns True when a game reference is currently set.
 */
export function isInitialized(): boolean {
    return gameRef !== null;
}

// Internal: Initialize the pointer events system
/**
 *
 */
function initializePointerEvents(): void {
    if (!gameRef) {
        console.warn("UIKitPointerEvents: Not initialized. Call initialize(game) first.");
        return;
    }

    if (pointerEventsInstance) {
        // Already initialized
        return;
    }

    const scene = gameRef.scene;
    const camera = asUIKitCamera(gameRef.uiCamera) ?? asUIKitCamera(gameRef.camera);
    const canvas = gameRef.renderer?.domElement ?? window.document.querySelector<HTMLCanvasElement>("canvas");

    if (!scene || !camera || !canvas) {
        console.warn("UIKitPointerEvents: Missing scene, camera, or canvas.");
        return;
    }

    pointerEventsInstance = forwardHtmlEvents(canvas, camera, scene, {
        batchEvents: true,
        intersectEveryFrame: false,
        forwardPointerCapture: true,
    });
}

// Internal: Clean up pointer events
/**
 *
 */
function cleanupPointerEvents(): void {
    if (pointerEventsInstance) {
        pointerEventsInstance.destroy();
        pointerEventsInstance = null;
    }
}

// Default export for convenience
export default {
    initialize,
    deinitialize,
    registerRoot,
    unregisterRoot,
    update,
    forceDispose,
    isActive,
    getRootCount,
    getInitRefCount,
    isInitialized,
};
