/**
 * Lambda System Types for Lambda Scripts
 * This file is imported as a raw string for Monaco Editor IntelliSense
 */

interface Lambda {
    /** Lambda type ID */
    readonly id: string;
    /** Unique instance UUID */
    readonly uuid: string;
    /** Instance attributes */
    readonly attributes: Record<string, any>;
    /** Map of registered objects to their component data */
    readonly registeredObjects: ReadonlyMap<THREE.Object3D, Record<string, any>>;
    /** Number of registered objects */
    readonly entityCount: number;

    /** Called when the lambda instance is created. Access game via this._game after init. */
    init(game: GameManager): void | Promise<void>;
    /** Called when the lambda is destroyed */
    dispose(): void;
    /** Called every frame — override this instead of apply() */
    update(deltaTime?: number): void;
    /** Called when an object is registered with this lambda */
    onObjectAdded(target: THREE.Object3D, componentData: Record<string, any>): void;
    /** Called when an object is deregistered */
    onObjectRemoved(target: THREE.Object3D): void;
    /** Called when an event is sent to this lambda */
    onEvent(msg: string, data: any): void;

    /** Get component data for a registered object */
    getComponentData(target: THREE.Object3D): Record<string, any> | null;
    /** Set a component data field for a registered object */
    setComponentData(target: THREE.Object3D, key: string, value: any): void;
}
