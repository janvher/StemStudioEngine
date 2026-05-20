import * as THREE from "three";
import {Camera, Scene} from "three";


export class EffectsManager {
    private static instance: EffectsManager | null = null;

    constructor(_scene: THREE.Scene, _camera: THREE.Camera) {}

    // Reset the singleton instance each time play is pressed
    // to help keep memory and objects optimized
    public static reset(
        scene: Scene,
        camera: Camera,
    ): EffectsManager {
        EffectsManager.instance = new EffectsManager(
            scene,
            camera,
        );
        return EffectsManager.instance;
    }

    public createMuzzleFlash(_position: THREE.Vector3, _camera: THREE.Camera) {}

    public createThrowableLaserEffect(_particlesPerFrame = 1, _particlesPerPosition = 20, _throwable: THREE.Mesh[]) {}

    public createFootDustEffect(
        _playerPostion: THREE.Vector3,
        _particleCount: number,
        _fadeOutDuration: number,
        _color: THREE.Color,
        _size: number,
        _opacity: number,
        _playerSize: number,
    ) {}

    dispose() {
        EffectsManager.instance = null;
    }
}
