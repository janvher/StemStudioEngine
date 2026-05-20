interface ShapeData<ShapeT> {
    sharedShape: ShapeT;
    refCount: number;
    removed: boolean;
}

export class ShapeCache<ShapeT> {
    /** Shape UUID to ShapeData */
    private shapeDataMap = new Map<string, ShapeData<ShapeT>>();

    constructor(private readonly destroyShape: (shape: ShapeT) => void) {
    }

    add(uuid: string, shape: ShapeT): void {
        if (this.hasShape(uuid)) {
            return;
        }

        this.shapeDataMap.set(
            uuid,
            {
                sharedShape: shape,
                refCount: 0,
                removed: false,
            },
        );
    }

    remove(uuid: string): void {
        const shapeData = this.shapeDataMap.get(uuid);
        if (!shapeData) {
            return;
        }

        shapeData.removed = true;
        this.maybeDestroyShape(uuid);
    }

    get(uuid: string): ShapeT | null {
        const shapeData = this.shapeDataMap.get(uuid);
        return shapeData?.sharedShape || null;
    }

    hasShape(uuid: string): boolean {
        return this.shapeDataMap.has(uuid);
    }

    retain(uuid: string): void {
        const shapeData = this.shapeDataMap.get(uuid);
        if (shapeData) {
            shapeData.refCount++;
        }
    }

    release(uuid: string): void {
        const shapeData = this.shapeDataMap.get(uuid);
        if (shapeData) {
            shapeData.refCount--;
            this.maybeDestroyShape(uuid);
        }
    }

    dispose(): void {
        for (const shapeData of this.shapeDataMap.values()) {
            this.destroyShape(shapeData.sharedShape);
        }
        this.shapeDataMap.clear();
    }

    private maybeDestroyShape(uuid: string): void {
        const shapeData = this.shapeDataMap.get(uuid);
        if (shapeData && shapeData.removed && shapeData.refCount <= 0) {
            this.destroyShape(shapeData.sharedShape);
            this.shapeDataMap.delete(uuid);
        }
    }
}
