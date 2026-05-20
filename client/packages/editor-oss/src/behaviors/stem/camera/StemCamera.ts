import { Quaternion, Vector3 } from 'three';

/**
 * Camera control interface for reading and modifying the scene camera.
 */
export interface StemCamera {
    /** Current camera world position (read-only). */
    readonly position: Vector3;
    /** Current camera orientation as a quaternion (read-only). */
    readonly quaternion: Quaternion;
    /** Vertical field of view in degrees. */
    fov: number;
    /** Near clipping plane distance. */
    near: number;
    /** Far clipping plane distance. */
    far: number;

    /**
     * Orient the camera to look at a world-space point.
     *
     * @param x - Target X coordinate
     * @param y - Target Y coordinate
     * @param z - Target Z coordinate
     */
    lookAt(x: number, y: number, z: number): void;
}
