/**
 * Global Declarations for Behavior Scripts
 * This file is imported as a raw string for Monaco Editor IntelliSense
 *
 * These variables are available in behavior scripts via 'with (this)' context
 */

/** THREE.js library - full Three.js namespace */
declare const THREE: typeof import('three');

/**
 * @deprecated Use the `onEvent()` lifecycle method and `game.behaviorManager.sendEventToObjectBehaviors()` /
 * `game.lambdaManager.sendEventToObjectLambdas()` instead. Direct EventBus usage in behaviors and lambdas
 * will be removed in a future version.
 */
declare const EventBus: {
    /** Subscribe to an event topic */
    subscribe(topic: string, callback: (msg: string, data: any) => void): string;
    /** Unsubscribe from an event using the token */
    unsubscribe(token: string): void;
    /** Send/publish an event */
    send(topic: string, data?: any): void;
    /** Reset all subscriptions */
    reset(): void;
};

/** Ammo.js physics library (Bullet Physics WASM) */
declare const Ammo: any;

/** CSS3DObject for rendering HTML elements in 3D space */
declare const CSS3DObject: any;

/** CSS3DSprite for rendering HTML sprites in 3D space */
declare const CSS3DSprite: any;

/** Lazy Cesium loader and helpers for globe/map-backed scenes */
declare const CesiumTool: {
    getBaseUrl(baseUrl?: string): string;
    load(options?: {
        baseUrl?: string;
        widgetsCss?: boolean;
        ionAccessToken?: string | null;
    }): Promise<typeof import("cesium")>;
    ensureContainer(parent: HTMLElement, id?: string, styles?: Record<string, string>): HTMLDivElement;
    destroyViewer(viewer: {
        destroy?: () => void;
        isDestroyed?: () => boolean;
    } | null | undefined): void;
};
