/**
 * AABB-based transparent sort function.
 * Uses the farthest point of the bounding box along the view direction
 * as the sort key, preventing artifacts with overlapping transparent objects.
 *
 * Inspired by Hytopia's three/utils.ts pattern.
 */

interface RenderItem {
    groupOrder: number;
    renderOrder: number;
    z: number;
    id: number;
    object: {
        geometry?: {
            boundingBox?: {
                min: { x: number; y: number; z: number };
                max: { x: number; y: number; z: number };
            };
        };
        userData?: Record<string, unknown>;
    };
}

let _sortFrame = 0;
// Cached view direction components (set each frame via advanceSortFrame)
let _vdx = 0;
let _vdy = 0;
let _vdz = -1;

/**
 * Call once per frame before rendering to advance the cache frame counter.
 * Optionally accepts the camera view direction for accurate AABB projection.
 * @param viewDirX
 * @param viewDirY
 * @param viewDirZ
 */
export function advanceSortFrame(viewDirX?: number, viewDirY?: number, viewDirZ?: number): void {
    _sortFrame++;
    if (viewDirX !== undefined && viewDirY !== undefined && viewDirZ !== undefined) {
        _vdx = viewDirX;
        _vdy = viewDirY;
        _vdz = viewDirZ;
    }
}

/**
 *
 * @param item
 */
function getSortKey(item: RenderItem): number {
    const ud = item.object?.userData;
    if (ud && (ud._sortFrame as number) === _sortFrame) {
        return ud._sortKey as number;
    }

    const bb = item.object?.geometry?.boundingBox;
    if (!bb) return item.z;

    // Project the AABB half-extents onto the cached view direction.
    // item.z is the center distance along the view axis (set by Three.js _projectObject).
    // projRadius = half-extent projected onto view direction (farthest corner along view).
    const hx = (bb.max.x - bb.min.x) * 0.5;
    const hy = (bb.max.y - bb.min.y) * 0.5;
    const hz = (bb.max.z - bb.min.z) * 0.5;
    // Dot product of half-extents with absolute view direction gives exact worst-case
    // projection of the AABB onto the view axis (support function of a box).
    const projRadius = hx * Math.abs(_vdx) + hy * Math.abs(_vdy) + hz * Math.abs(_vdz);
    const key = item.z + projRadius;

    if (ud) {
        ud._sortKey = key;
        ud._sortFrame = _sortFrame;
    }

    return key;
}

/**
 * Custom transparent sort: farthest-point of AABB along view direction.
 * Renders far-to-near for correct alpha blending.
 * @param a
 * @param b
 */
export function aabbTransparentSort(a: RenderItem, b: RenderItem): number {
    if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
    if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;

    const az = getSortKey(a);
    const bz = getSortKey(b);
    if (az !== bz) return bz - az; // far to near

    return a.id - b.id;
}
