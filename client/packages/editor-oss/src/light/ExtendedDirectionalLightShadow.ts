import {DirectionalLight, DirectionalLightShadow, Matrix4, Vector3, WebGPUCoordinateSystem} from "three";

import {ExtendedDirectionalLight} from "./ExtendedDirectionalLight";

const _projScreenMatrix = /*@__PURE__*/ new Matrix4();
const _lookTarget = /*@__PURE__*/ new Vector3();
const _lightPositionWorld = /*@__PURE__*/ new Vector3();

// Temp variables for Unity-style placement — avoids per-frame allocations
const _lightDir = /*@__PURE__*/ new Vector3();
const _center = /*@__PURE__*/ new Vector3();
const _mainCamWorldPos = /*@__PURE__*/ new Vector3();
const _lightViewMatrix = /*@__PURE__*/ new Matrix4();
const _lightViewMatrixInverse = /*@__PURE__*/ new Matrix4();
const _origin = /*@__PURE__*/ new Vector3(0, 0, 0);
const _up = /*@__PURE__*/ new Vector3(0, 1, 0);

const tmpLight = new DirectionalLight(0xffffff, 1);
// @ts-expect-error Three.js does not export the constructor of DirectionalLightShadow,
// so we need to create a temporary instance to access its constructor.
// Sorry for the hack!
class ExtendedDirectionalLightShadow extends tmpLight.shadow.constructor {
    // public camera!: OrthographicCamera;
    // public matrix!: Matrix4;
    // public _frustum!: Frustum;

    updateMatrices(light: ExtendedDirectionalLight) {
        const self = this as unknown as DirectionalLightShadow;
        const shadowCamera = self.camera;
        const shadowMatrix = self.matrix;

        if (light.isUnityStyle) {
            // Unity-style: shadow camera follows main camera, direction from quaternion.
            const mainCamera = light.mainCamera;
            if (!mainCamera) {
                return;
            }

            // --- 1. Inputs -----------------------------------------------------------
            light.getWorldDirection(_lightDir);             // unit light direction
            mainCamera.getWorldPosition(_mainCamWorldPos);  // shadow volume center

            // --- 2. Auto-compute shadow depth from ortho half-size -------------------
            // Unity keeps the shadow volume roughly cubic so depth-buffer precision
            // is not wasted on an elongated frustum.
            const orthoSize = Math.max(shadowCamera.top, shadowCamera.right);
            const shadowDepth = Math.max(orthoSize * 4, 100);
            shadowCamera.near = 0;
            shadowCamera.far = shadowDepth;
            shadowCamera.updateProjectionMatrix();

            // --- 3. Build light-space rotation matrix --------------------------------
            // lookAt(origin → lightDir) gives: Z = -lightDir, look along -Z = lightDir
            _up.set(0, 1, 0);
            if (Math.abs(_lightDir.dot(_up)) > 0.999) _up.set(1, 0, 0);
            _lightViewMatrix.lookAt(_origin, _lightDir, _up);           // light-local → world
            _lightViewMatrixInverse.copy(_lightViewMatrix).invert();     // world → light-local

            // --- 4. Snap shadow center in light-space --------------------------------
            // Transform the main camera position into light-aligned space where
            //   X,Y = perpendicular to light direction
            //   Z   = along -lightDir (depth axis)
            // Snapping X,Y to texel boundaries prevents shadow edge shimmer.
            _center.copy(_mainCamWorldPos).applyMatrix4(_lightViewMatrixInverse);

            const texelX = (shadowCamera.right - shadowCamera.left) / self.mapSize.x;
            const texelY = (shadowCamera.top - shadowCamera.bottom) / self.mapSize.y;
            _center.x = Math.floor(_center.x / texelX) * texelX;
            _center.y = Math.floor(_center.y / texelY) * texelY;

            // --- 5. Position shadow camera behind snapped center ---------------------
            // In light-space +Z points away from where the light shines (camera convention),
            // so offsetting +Z pushes the camera "behind" the scene toward the light source.
            _center.z += shadowDepth / 2;

            // --- 6. Transform back to world-space ------------------------------------
            _center.applyMatrix4(_lightViewMatrix);

            // --- 7. Orient shadow camera ---------------------------------------------
            shadowCamera.position.copy(_center);
            _lookTarget.copy(_center).add(_lightDir);   // look along light direction
            shadowCamera.lookAt(_lookTarget);
            shadowCamera.updateMatrixWorld();
        } else {
            // Default three.js behavior
            _lightPositionWorld.setFromMatrixPosition(light.matrixWorld);
            shadowCamera.position.copy(_lightPositionWorld);

            _lookTarget.setFromMatrixPosition(light.target.matrixWorld);
            shadowCamera.lookAt(_lookTarget);
            shadowCamera.updateMatrixWorld();
        }

        _projScreenMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse);
        (self as any)._frustum.setFromProjectionMatrix(_projScreenMatrix, shadowCamera.coordinateSystem, shadowCamera.reversedDepth);

        if (shadowCamera.coordinateSystem === WebGPUCoordinateSystem || shadowCamera.reversedDepth) {
            shadowMatrix.set(
                0.5, 0.0, 0.0, 0.5,
                0.0, 0.5, 0.0, 0.5,
                0.0, 0.0, 1.0, 0.0, // Identity Z (preserving the correct [0, 1] range from the projection matrix)
                0.0, 0.0, 0.0, 1.0,
            );
        } else {
            shadowMatrix.set(
                0.5, 0.0, 0.0, 0.5,
                0.0, 0.5, 0.0, 0.5,
                0.0, 0.0, 0.5, 0.5,
                0.0, 0.0, 0.0, 1.0,
            );
        }

        shadowMatrix.multiply(_projScreenMatrix);
    }
}

export {ExtendedDirectionalLightShadow};
