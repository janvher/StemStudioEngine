import { Object3D, Vector3 } from "three";

import type { ISpatialGrid } from "../types";

/**
 * 3D uniform spatial grid for O(1) distance lookups.
 * Replaces per-frame O(n) getWorldPosition() calls in LambdaScheduler.shouldProcess().
 *
 * Cells are cubes of `cellSize` units. Each entity is stored in its cell
 * and its world position is cached so distance queries avoid getWorldPosition().
 */
export class UniformSpatialGrid implements ISpatialGrid {
    private cellSize: number;
    private inverseCellSize: number;
    private cells: Map<string, Set<string>> = new Map();
    private entityCells: Map<string, string> = new Map();
    private entityPositions: Map<string, Vector3> = new Map();
    private entityObjects: Map<string, Object3D> = new Map();
    private _auxVec = new Vector3();

    constructor(cellSize: number = 25) {
        this.cellSize = cellSize;
        this.inverseCellSize = 1 / cellSize;
    }

    private cellKey(x: number, y: number, z: number): string {
        return `${Math.floor(x * this.inverseCellSize)}:${Math.floor(y * this.inverseCellSize)}:${Math.floor(z * this.inverseCellSize)}`;
    }

    /**
     * Update (or insert) an entity's position in the grid.
     * Call once per frame per entity, typically from a SpatialGridSystem adapter.
     * @param entityId
     * @param object
     */
    update(entityId: string, object: Object3D): void {
        object.getWorldPosition(this._auxVec);
        const newKey = this.cellKey(this._auxVec.x, this._auxVec.y, this._auxVec.z);
        const oldKey = this.entityCells.get(entityId);

        // Fast path: same cell, just update position
        if (oldKey === newKey) {
            this.entityPositions.get(entityId)?.copy(this._auxVec);
            return;
        }

        // Remove from old cell
        if (oldKey) {
            this.cells.get(oldKey)?.delete(entityId);
        }

        // Insert into new cell
        let cell = this.cells.get(newKey);
        if (!cell) {
            cell = new Set();
            this.cells.set(newKey, cell);
        }
        cell.add(entityId);
        this.entityCells.set(entityId, newKey);

        // Cache position
        let pos = this.entityPositions.get(entityId);
        if (!pos) {
            pos = new Vector3();
            this.entityPositions.set(entityId, pos);
        }
        pos.copy(this._auxVec);

        // Store Object3D ref for reverse lookups
        this.entityObjects.set(entityId, object);
    }

    /**
     * O(1) cached distance squared to a point.
     * Returns null if entity is not tracked.
     * @param entityId
     * @param point
     */
    getDistanceSq(entityId: string, point: Vector3): number | null {
        const pos = this.entityPositions.get(entityId);
        return pos ? pos.distanceToSquared(point) : null;
    }

    /**
     * Query all entities within radius of a position.
     * Checks neighboring cells, then exact distance filter.
     * @param position
     * @param radius
     */
    queryRadius(position: Vector3, radius: number): string[] {
        const results: string[] = [];
        const radiusSq = radius * radius;
        const cellRadius = Math.ceil(radius * this.inverseCellSize);
        const cx = Math.floor(position.x * this.inverseCellSize);
        const cy = Math.floor(position.y * this.inverseCellSize);
        const cz = Math.floor(position.z * this.inverseCellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                    const cell = this.cells.get(`${cx + dx}:${cy + dy}:${cz + dz}`);
                    if (!cell) continue;
                    for (const entityId of cell) {
                        const pos = this.entityPositions.get(entityId);
                        if (pos && pos.distanceToSquared(position) <= radiusSq) {
                            results.push(entityId);
                        }
                    }
                }
            }
        }
        return results;
    }

    /**
     * Get the cached Object3D reference for an entity.
     * @param entityId
     */
    getObject(entityId: string): Object3D | undefined {
        return this.entityObjects.get(entityId);
    }

    /**
     * Get the cached world position for an entity.
     * @param entityId
     */
    getPosition(entityId: string): Vector3 | undefined {
        return this.entityPositions.get(entityId);
    }

    remove(entityId: string): void {
        const key = this.entityCells.get(entityId);
        if (key) {
            this.cells.get(key)?.delete(entityId);
            this.entityCells.delete(entityId);
            this.entityPositions.delete(entityId);
            this.entityObjects.delete(entityId);
        }
    }

    get entityCount(): number {
        return this.entityCells.size;
    }

    get cellCount(): number {
        return this.cells.size;
    }

    dispose(): void {
        this.cells.clear();
        this.entityCells.clear();
        this.entityPositions.clear();
        this.entityObjects.clear();
    }
}
