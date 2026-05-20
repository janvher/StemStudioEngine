import type { Object3D } from "three";

/**
 * Schema-driven Struct-of-Arrays (SoA) component storage.
 * Stores component data in contiguous TypedArrays for cache-friendly
 * iteration in hot lambda update loops.
 *
 * Uses swap-remove for O(1) entity removal.
 */

export interface ComponentFieldSchema {
    name: string;
    type: "f32" | "i32" | "u8";
    default?: number;
}

type TypedArray = Float32Array | Int32Array | Uint8Array;

export class ComponentStore {
    private fields: Map<string, TypedArray> = new Map();
    private entityToIndex: Map<string, number> = new Map();
    private indexToEntity: string[] = [];
    private objectRefs: (Object3D | null)[] = [];
    private _count: number = 0;
    private _capacity: number;
    private schema: ComponentFieldSchema[];

    constructor(schema: ComponentFieldSchema[], initialCapacity: number = 256) {
        this.schema = schema;
        this._capacity = initialCapacity;
        for (const field of schema) {
            this.fields.set(field.name, this.allocateArray(field.type, initialCapacity));
        }
        this.objectRefs = new Array(initialCapacity).fill(null);
    }

    get count(): number {
        return this._count;
    }

    get capacity(): number {
        return this._capacity;
    }

    addEntity(uuid: string, object: Object3D, data: Record<string, any>): number {
        if (this.entityToIndex.has(uuid)) {
            return this.entityToIndex.get(uuid)!;
        }

        if (this._count >= this._capacity) {
            this.grow();
        }

        const index = this._count++;
        this.entityToIndex.set(uuid, index);
        this.indexToEntity[index] = uuid;
        this.objectRefs[index] = object;

        for (const field of this.schema) {
            this.fields.get(field.name)![index] = data[field.name] ?? field.default ?? 0;
        }

        return index;
    }

    /**
     * Swap-remove: O(1) removal by swapping with last element.
     * @param uuid
     */
    removeEntity(uuid: string): void {
        const index = this.entityToIndex.get(uuid);
        if (index === undefined) return;

        const lastIndex = this._count - 1;

        if (index !== lastIndex) {
            // Swap with last element
            const lastUuid = this.indexToEntity[lastIndex]!;
            for (const [, arr] of this.fields) {
                arr[index] = arr[lastIndex]!;
            }
            this.objectRefs[index] = this.objectRefs[lastIndex] ?? null;
            this.indexToEntity[index] = lastUuid;
            this.entityToIndex.set(lastUuid, index);
        }

        this.entityToIndex.delete(uuid);
        this.objectRefs[lastIndex] = null;
        this._count--;
    }

    hasEntity(uuid: string): boolean {
        return this.entityToIndex.has(uuid);
    }

    getIndex(uuid: string): number | undefined {
        return this.entityToIndex.get(uuid);
    }

    getField(name: string): TypedArray | undefined {
        return this.fields.get(name);
    }

    getObject(index: number): Object3D | null {
        return index < this._count ? this.objectRefs[index] ?? null : null;
    }

    /**
     * Set a single field value for an entity.
     * @param uuid
     * @param fieldName
     * @param value
     */
    setFieldValue(uuid: string, fieldName: string, value: number): void {
        const index = this.entityToIndex.get(uuid);
        if (index === undefined) return;
        const arr = this.fields.get(fieldName);
        if (arr) arr[index] = value;
    }

    /**
     * Get a single field value for an entity.
     * @param uuid
     * @param fieldName
     */
    getFieldValue(uuid: string, fieldName: string): number | undefined {
        const index = this.entityToIndex.get(uuid);
        if (index === undefined) return undefined;
        return this.fields.get(fieldName)?.[index];
    }

    private grow(): void {
        const newCap = this._capacity * 2;
        for (const field of this.schema) {
            const oldArr = this.fields.get(field.name)!;
            const newArr = this.allocateArray(field.type, newCap);
            newArr.set(oldArr);
            this.fields.set(field.name, newArr);
        }
        // Extend object refs array
        const newRefs = new Array(newCap).fill(null);
        for (let i = 0; i < this._count; i++) {
            newRefs[i] = this.objectRefs[i];
        }
        this.objectRefs = newRefs;
        this._capacity = newCap;
    }

    private allocateArray(type: "f32" | "i32" | "u8", size: number): TypedArray {
        switch (type) {
            case "f32": return new Float32Array(size);
            case "i32": return new Int32Array(size);
            case "u8": return new Uint8Array(size);
        }
    }

    dispose(): void {
        this.fields.clear();
        this.entityToIndex.clear();
        this.indexToEntity = [];
        this.objectRefs = [];
        this._count = 0;
    }
}
