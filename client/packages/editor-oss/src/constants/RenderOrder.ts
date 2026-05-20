/**
 * Centralized render order layers for Three.js objects.
 * Higher values render on top of lower values.
 *
 * Usage:
 *   object.renderOrder = RenderOrder.UI;
 *   setDefaultRenderOrder(RenderOrder.UI);
 */
export const RenderOrder = {
    /** Default scene objects, grid, terrain, skybox */
    SCENE: 0,
    /** Shadow planes */
    SHADOW: 1,
    /** Curve editor controls */
    CURVE_EDITOR: 999,
    /** Selection boxes and helpers */
    SELECTION: 9999,
    /** UIKit HUD elements (via setDefaultRenderOrder) */
    UI: 10000,
} as const;
