import type {Object3D} from "three";

import {LambdaBase} from "../../LambdaBase";

/** Per-object collider component data. */
interface ColliderData {
    shape: string;
    sizeX: number;
    sizeY: number;
    sizeZ: number;
    [key: string]: unknown;
}

export default class ColliderLambda extends LambdaBase {
    private _activeCollisions: Set<string> = new Set();
    // Reuse between frames to avoid allocation
    private _currentCollisions: Set<string> = new Set();
    private _entriesCache: [Object3D, ColliderData][] = [];
    private _entriesDirty: boolean = true;

    onObjectAdded(): void {
        this._entriesDirty = true;
    }

    onObjectRemoved(): void {
        this._entriesDirty = true;
    }

    private _pairKey(a: Object3D, b: Object3D): string {
        const idA = a.uuid;
        const idB = b.uuid;
        return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
    }

    update(_deltaTime: number = 0.016): void {
        // Rebuild entries array only when objects change
        if (this._entriesDirty) {
            this._entriesCache = Array.from(this._registeredObjects.entries()) as [Object3D, ColliderData][];
            this._entriesDirty = false;
        }

        const entries = this._entriesCache;
        const current = this._currentCollisions;
        current.clear();

        // Test all pairs for intersection
        for (let i = 0; i < entries.length; i++) {
            const [objA, dataA] = entries[i]!;
            for (let j = i + 1; j < entries.length; j++) {
                const [objB, dataB] = entries[j]!;

                if (this._intersects(objA, dataA, objB, dataB)) {
                    const key = this._pairKey(objA, objB);
                    current.add(key);

                    if (!this._activeCollisions.has(key)) {
                        this._game?.engine?.call("lambdaEvent", null, {
                            event: "collisionEnter",
                            lambdaId: this.id,
                            objectA: objA.uuid,
                            objectB: objB.uuid,
                        });
                    }
                }
            }
        }

        // Fire exit events for ended collisions
        for (const key of this._activeCollisions) {
            if (!current.has(key)) {
                this._game?.engine?.call("lambdaEvent", null, {
                    event: "collisionExit",
                    lambdaId: this.id,
                    pairKey: key,
                });
            }
        }

        // Swap sets to avoid allocation
        const tmp = this._activeCollisions;
        this._activeCollisions = current;
        this._currentCollisions = tmp;
    }

    private _intersects(
        objA: Object3D, dataA: ColliderData,
        objB: Object3D, dataB: ColliderData,
    ): boolean {
        const shapeA = dataA.shape;
        const shapeB = dataB.shape;

        if (shapeA === "sphere" && shapeB === "sphere") {
            return this._sphereSphere(objA, dataA.sizeX, objB, dataB.sizeX);
        }

        if (shapeA === "box" && shapeB === "box") {
            return this._boxBox(objA, dataA, objB, dataB);
        }

        // Mixed / capsule: fall back to sphere approximation
        const radiusA = shapeA === "sphere" ? dataA.sizeX : Math.max(dataA.sizeX, dataA.sizeY, dataA.sizeZ) * 0.5;
        const radiusB = shapeB === "sphere" ? dataB.sizeX : Math.max(dataB.sizeX, dataB.sizeY, dataB.sizeZ) * 0.5;
        return this._sphereSphere(objA, radiusA, objB, radiusB);
    }

    private _sphereSphere(a: Object3D, rA: number, b: Object3D, rB: number): boolean {
        const dx = a.position.x - b.position.x;
        const dy = a.position.y - b.position.y;
        const dz = a.position.z - b.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const radii = rA + rB;
        return distSq <= radii * radii;
    }

    private _boxBox(
        a: Object3D, dA: ColliderData,
        b: Object3D, dB: ColliderData,
    ): boolean {
        const hxA = dA.sizeX * 0.5, hyA = dA.sizeY * 0.5, hzA = dA.sizeZ * 0.5;
        const hxB = dB.sizeX * 0.5, hyB = dB.sizeY * 0.5, hzB = dB.sizeZ * 0.5;

        return (
            Math.abs(a.position.x - b.position.x) <= hxA + hxB &&
            Math.abs(a.position.y - b.position.y) <= hyA + hyB &&
            Math.abs(a.position.z - b.position.z) <= hzA + hzB
        );
    }

    dispose(): void {
        this._activeCollisions.clear();
        this._currentCollisions.clear();
        this._entriesCache = [];
        super.dispose();
    }
}
