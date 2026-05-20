/**
 * UIKit Types for Behavior Scripts
 * This file is imported as a raw string for Monaco Editor IntelliSense
 *
 * UIKit library for building 3D user interfaces with Three.js and yoga layout.
 * Components extend THREE.Mesh and can be added to any Object3D.
 *
 * @example
 * ```javascript
 * const container = new UIKit.Container({
 *     width: 300,
 *     height: 200,
 *     backgroundColor: 0x333333,
 *     borderRadius: 8
 * });
 * this.target.add(container);
 *
 * const text = new UIKit.Text({ text: 'Hello World', fontSize: 24 });
 * container.add(text);
 * ```
 */

declare const UIKit: {
    /**
     * Container component - the main building block for layouts.
     * Supports flexbox layout via yoga-layout.
     */
    Container: new (properties?: {
        width?: number;
        height?: number;
        backgroundColor?: number;
        backgroundOpacity?: number;
        borderRadius?: number;
        borderWidth?: number;
        borderColor?: number;
        padding?: number;
        paddingTop?: number;
        paddingBottom?: number;
        paddingLeft?: number;
        paddingRight?: number;
        margin?: number;
        flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
        justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
        alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
        gap?: number;
        overflow?: 'visible' | 'hidden' | 'scroll';
        pointerEvents?: 'auto' | 'none';
        hover?: object;
        active?: object;
        onClick?: () => void;
        onPointerEnter?: () => void;
        onPointerLeave?: () => void;
        [key: string]: any;
    }) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        add(...objects: THREE.Object3D[]): any;
        setProperties(properties: object): void;
    };

    /**
     * Text component for rendering text in 3D space.
     */
    Text: new (properties?: {
        text?: string;
        fontSize?: number;
        fontWeight?: number | 'normal' | 'bold';
        color?: number;
        opacity?: number;
        textAlign?: 'left' | 'center' | 'right';
        verticalAlign?: 'top' | 'center' | 'bottom';
        letterSpacing?: number;
        lineHeight?: number;
        maxLines?: number;
        [key: string]: any;
    }) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        setProperties(properties: object): void;
    };

    /**
     * Image component for displaying images.
     */
    Image: new (properties?: {
        src?: string;
        width?: number;
        height?: number;
        objectFit?: 'fill' | 'contain' | 'cover';
        borderRadius?: number;
        opacity?: number;
        [key: string]: any;
    }) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        setProperties(properties: object): void;
    };

    /**
     * Input component for text input.
     */
    Input: new (properties?: {
        value?: string;
        placeholder?: string;
        fontSize?: number;
        color?: number;
        backgroundColor?: number;
        borderRadius?: number;
        padding?: number;
        onValueChange?: (value: string) => void;
        [key: string]: any;
    }) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        setProperties(properties: object): void;
    };

    /**
     * Fullscreen component - camera-facing UI that fills the viewport.
     */
    Fullscreen: new (renderer: any, properties?: {
        distanceToCamera?: number;
        [key: string]: any;
    }) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        add(...objects: THREE.Object3D[]): any;
        setProperties(properties: object): void;
    };

    /**
     * Content component for scrollable content areas.
     */
    Content: new (properties?: object) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        setProperties(properties: object): void;
    };

    /**
     * SVG component for rendering SVG graphics.
     */
    Svg: new (properties?: {
        src?: string;
        width?: number;
        height?: number;
        color?: number;
        [key: string]: any;
    }) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        setProperties(properties: object): void;
    };

    /**
     * Video component for displaying video.
     */
    Video: new (properties?: {
        src?: string;
        width?: number;
        height?: number;
        autoplay?: boolean;
        loop?: boolean;
        [key: string]: any;
    }) => THREE.Mesh & {
        update(delta: number): void;
        dispose(): void;
        setProperties(properties: object): void;
    };

    // Utility exports
    setPreferredColorScheme: (scheme: 'light' | 'dark' | 'system') => void;
    getPreferredColorScheme: () => 'light' | 'dark' | 'system';
    isDarkMode: () => boolean;
};

/**
 * UIKit Pointer Events - Lazy initialization for UIKit interactions.
 * Only activates when UIKit roots exist, avoiding performance overhead.
 *
 * Reference counted - safe for multiple behaviors to use simultaneously.
 *
 * @example
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
declare const UIKitPointerEvents: {
    /**
     * Initialize with GameManager. Call once in your behavior's init().
     * Reference counted - pair with deinitialize() in dispose().
     * @param game - The GameManager instance
     */
    initialize: (game: GameManager) => void;

    /**
     * Decrement init reference count. Call in your behavior's dispose().
     * Full cleanup occurs when ref count reaches 0 AND no roots exist.
     */
    deinitialize: () => void;

    /**
     * Register a UIKit component as a root.
     * Pointer events are enabled when the first root is registered.
     * @param component - The UIKit component (Container, Fullscreen, etc.)
     */
    registerRoot: (component: any) => void;

    /**
     * Unregister a UIKit root. Pointer events disabled when last root is removed.
     * @param component - The UIKit component to unregister
     */
    unregisterRoot: (component: any) => void;

    /**
     * Update pointer events and all UIKit roots. Call in your update() loop.
     * @param deltaTime - Time since last frame in seconds
     */
    update: (deltaTime?: number) => void;

    /**
     * Force cleanup - bypasses reference counting. Use sparingly.
     */
    forceDispose: () => void;

    /**
     * Check if pointer events system is active.
     */
    isActive: () => boolean;

    /**
     * Get number of active UIKit roots.
     */
    getRootCount: () => number;

    /**
     * Get current initialization reference count.
     */
    getInitRefCount: () => number;

    /**
     * Check if system is initialized (has game reference).
     */
    isInitialized: () => boolean;
};
