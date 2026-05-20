import { Camera, Color, ColorRepresentation, DirectionalLight, DirectionalLightShadow, Vector3 } from 'three';

import { ExtendedDirectionalLightShadow } from './ExtendedDirectionalLightShadow';

const _direction = new Vector3(0, -1, 0);
const _worldPosition = /*@__PURE__*/ new Vector3();
const AXIS_Z = new Vector3(0, 0, 1);

class ExtendedDirectionalLight extends DirectionalLight {
    /**
     * Global registry of all ExtendedDirectionalLight instances.
     * Used to avoid expensive scene traversals each frame.
     */
    static instances: Set<ExtendedDirectionalLight> = new Set();

    /**
     * Indicates if the light uses a Unity-style shadow camera.
     * @defaultValue `false`
     */
    private _isUnityStyle: boolean = false;

    /**
     * The main camera that the light follows (if using Unity-style shadows).
     * @defaultValue `null`
     */
    mainCamera: Camera | null;

    /**
     * Read-only flag to check if a given object is of type {@link ExtendedDirectionalLight}.
     * @remarks This is a _constant_ value
     * @defaultValue `true`
     */
    readonly isExtendedDirectionalLight = true;

    set isUnityStyle(isUnityStyle: boolean) {
        this._isUnityStyle = isUnityStyle;

        if (!isUnityStyle) {
            this.target.position.set(0, 0, 0);
        } else {
            // Use world positions to correctly handle lights under transformed parents
            const dir = this.target.getWorldPosition(_direction).sub(this.getWorldPosition(_worldPosition));
            this.quaternion.setFromUnitVectors(AXIS_Z, dir.normalize());
        }

        this.updateLight();
    }

    get isUnityStyle() {
        return this._isUnityStyle;
    }

    constructor(color?: ColorRepresentation, intensity: number = 1) {
        super(color, intensity);

        this.isUnityStyle = false;
        this.mainCamera = null;

        this.shadow = new ExtendedDirectionalLightShadow() as unknown as DirectionalLightShadow;
        // NOTE: somebody overwrites the shadow camera's name after it's created, so we need to set it in a timeout to ensure it sticks
        setTimeout(() => {
            this.shadow.camera.name = "ExtendedDirectionalLightShadowCamera";
        }, 0);

        // Ensure the light's target doesn't cast/receive shadows
        this.target.castShadow = false;
        this.target.receiveShadow = false;

        // Ensure the light object itself doesn't cast/receive shadows (the light illuminates, it doesn't cast)
        this.castShadow = true;  // This means the light CREATES shadows, not that it casts one
        this.receiveShadow = false;

        // track instances to allow quick per-frame updates without scene traversal
        ExtendedDirectionalLight.instances.add(this);
    }

    copy(source: this) {
        super.copy(source);

        this.isUnityStyle = source.isUnityStyle;
        this.mainCamera = source.mainCamera;

        this.shadow = source.shadow.clone();

        return this;
    }

    updateLight(camera: Camera | null = this.mainCamera) {
        this.mainCamera = camera;

        if (this.isUnityStyle && this.mainCamera) {
            // Direction derived from quaternion (Unity: rotation defines light direction)
            this.getWorldDirection(_direction);
            this.getWorldPosition(_worldPosition);
            // Place target along light direction from world position.
            // Three.js derives dir as normalize(target.worldPos - light.worldPos),
            // so target = worldPos + dir is sufficient (magnitude doesn't matter).
            this.target.position.copy(_worldPosition).add(_direction);
            this.target.updateMatrixWorld();

            this.shadow.updateMatrices(this);
        }
    }

    /**
     * Disposes of this light's resources and unregisters it from the global registry.
     */
    dispose(): void {
        ExtendedDirectionalLight.instances.delete(this);

        super.dispose();
    }
}

export { ExtendedDirectionalLight };
