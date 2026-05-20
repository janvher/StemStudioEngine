
import * as THREE from "three";
import { Matrix4, Object3D } from "three";

/**
 * Transform data structure containing position, quaternion, and scale
 */
export interface TransformData {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    scale: THREE.Vector3;
}

/**
 * Transform utilities for coordinate space transformations and matrix operations
 */
export class TransformUtils {
    // Reusable objects to avoid memory allocation in hot paths
    private static readonly _tempMatrix = new THREE.Matrix4();
    private static readonly _tempPosition = new THREE.Vector3();
    private static readonly _tempQuaternion = new THREE.Quaternion();
    private static readonly _tempScale = new THREE.Vector3();

    /**
     * Get world transform data for an object
     * @param object - The Three.js object
     * @returns World transform data containing position, quaternion, and scale
     */
    static getWorldTransform(object: THREE.Object3D): TransformData {
        // Update matrices to ensure accurate world transforms
        object.updateMatrixWorld(true);

        // Decompose world matrix into components
        object.matrixWorld.decompose(
            this._tempPosition,
            this._tempQuaternion,
            this._tempScale,
        );

        return {
            position: this._tempPosition.clone(),
            quaternion: this._tempQuaternion.clone(),
            scale: this._tempScale.clone(),
        };
    }

    /**
     * Convert world transform to local transform for an object
     * @param object - The target object
     * @param worldTransform - World transform data
     * @returns Local transform data
     */
    static worldToLocalTransform(object: THREE.Object3D, worldTransform: TransformData): TransformData {
        if (!this.isChildObject(object)) {
            // For root objects, world and local coordinates are the same
            return {
                position: worldTransform.position.clone(),
                quaternion: worldTransform.quaternion.clone(),
                scale: worldTransform.scale.clone(),
            };
        }

        // For child objects, convert world to local coordinates
        const parentMatrixInverse = this._tempMatrix.copy(object.parent!.matrixWorld).invert();
        
        // Create world matrix from transform components
        const worldMatrix = new THREE.Matrix4().compose(
            worldTransform.position,
            worldTransform.quaternion,
            worldTransform.scale,
        );

        // Convert to local matrix: localMatrix = parentMatrixInverse * worldMatrix
        const localMatrix = new THREE.Matrix4().multiplyMatrices(parentMatrixInverse, worldMatrix);

        // Extract local transform components
        localMatrix.decompose(this._tempPosition, this._tempQuaternion, this._tempScale);

        return {
            position: this._tempPosition.clone(),
            quaternion: this._tempQuaternion.clone(),
            scale: this._tempScale.clone(),
        };
    }

    /**
     * Convert local transform to world transform for an object
     * @param object - The target object
     * @param localTransform - Local transform data
     * @returns World transform data
     */
    static localToWorldTransform(object: THREE.Object3D, localTransform: TransformData): TransformData {
        if (!this.isChildObject(object)) {
            // For root objects, local and world coordinates are the same
            return {
                position: localTransform.position.clone(),
                quaternion: localTransform.quaternion.clone(),
                scale: localTransform.scale.clone(),
            };
        }

        // For child objects, convert local to world coordinates
        const localMatrix = this._tempMatrix.compose(
            localTransform.position,
            localTransform.quaternion,
            localTransform.scale,
        );

        // Convert to world matrix: worldMatrix = parentMatrix * localMatrix
        const worldMatrix = new THREE.Matrix4().multiplyMatrices(object.parent!.matrixWorld, localMatrix);

        // Extract world transform components
        worldMatrix.decompose(this._tempPosition, this._tempQuaternion, this._tempScale);

        return {
            position: this._tempPosition.clone(),
            quaternion: this._tempQuaternion.clone(),
            scale: this._tempScale.clone(),
        };
    }

    /**
     * Apply world transform to an object, automatically converting to local coordinates
     * @param object - The target object
     * @param worldTransform - World transform data to apply
     */
    static applyWorldTransform(object: THREE.Object3D, worldTransform: TransformData): void {
        if (!object || !worldTransform) {
            return;
        }

        if (this.isChildObject(object)) {
            // For child objects, convert world coordinates to local coordinates
            const localTransform = this.worldToLocalTransform(object, worldTransform);
            
            // Apply local transforms
            object.position.copy(localTransform.position);
            object.quaternion.copy(localTransform.quaternion);
            object.scale.copy(localTransform.scale);
        } else {
            // For root objects, directly apply world transforms
            object.position.copy(worldTransform.position);
            object.quaternion.copy(worldTransform.quaternion);
            object.scale.copy(worldTransform.scale);
        }

        object.updateMatrixWorld(true);
    }

    /**
     * Apply local transform to an object
     * @param object - The target object
     * @param localTransform - Local transform data to apply
     */
    static applyLocalTransform(object: THREE.Object3D, localTransform: TransformData): void {
        if (!object || !localTransform) {
            return;
        }

        object.position.copy(localTransform.position);
        object.quaternion.copy(localTransform.quaternion);
        object.scale.copy(localTransform.scale);
        object.updateMatrixWorld(true);
    }

    /**
     * Calculate transformation delta matrix between two transform states
     * @param initial - Initial transform state
     * @param current - Current transform state
     * @returns Delta transformation matrix
     */
    static calculateDeltaMatrix(initial: TransformData, current: TransformData): THREE.Matrix4 {
        // Create matrices from transform data
        const initialMatrix = new THREE.Matrix4().compose(
            initial.position,
            initial.quaternion,
            initial.scale,
        );

        const currentMatrix = new THREE.Matrix4().compose(
            current.position,
            current.quaternion,
            current.scale,
        );

        // Calculate delta: deltaMatrix = currentMatrix * initialMatrix^-1
        const deltaMatrix = currentMatrix.clone();
        deltaMatrix.multiply(initialMatrix.invert());

        return deltaMatrix;
    }

    /**
     * Apply delta transformation matrix to a transform, simulating parent-child relationship
     * @param baseTransform - Base transform to apply delta to
     * @param deltaMatrix - Delta transformation matrix
     * @returns New transform after applying delta
     */
    static applyDeltaTransform(baseTransform: TransformData, deltaMatrix: THREE.Matrix4): TransformData {
        // Create matrix from base transform
        const baseMatrix = this._tempMatrix.compose(
            baseTransform.position,
            baseTransform.quaternion,
            baseTransform.scale,
        );

        // Apply delta transformation: resultMatrix = deltaMatrix * baseMatrix
        baseMatrix.premultiply(deltaMatrix);

        // Extract transformed components
        baseMatrix.decompose(this._tempPosition, this._tempQuaternion, this._tempScale);

        return {
            position: this._tempPosition.clone(),
            quaternion: this._tempQuaternion.clone(),
            scale: this._tempScale.clone(),
        };
    }

    /**
     * Create a transform data structure from position, quaternion, and scale vectors
     * @param position - Position vector
     * @param quaternion - Quaternion rotation
     * @param scale - Scale vector
     * @returns Transform data structure
     */
    static createTransform(
        position: THREE.Vector3,
        quaternion: THREE.Quaternion,
        scale: THREE.Vector3,
    ): TransformData {
        return {
            position: position.clone(),
            quaternion: quaternion.clone(),
            scale: scale.clone(),
        };
    }

    /**
     * Clone a transform data structure
     * @param transform - Transform to clone
     * @returns Cloned transform data
     */
    static cloneTransform(transform: TransformData): TransformData {
        return {
            position: transform.position.clone(),
            quaternion: transform.quaternion.clone(),
            scale: transform.scale.clone(),
        };
    }

    /**
     * Check if an object is a child of another object (not a root object)
     * @param object - The Three.js object to check
     * @returns True if the object is a child of another object, false if it is a root object
     */
    private static isChildObject(object: THREE.Object3D): boolean {
        if (!object || !object.parent) {
            return false;
        }

        return !(object.parent instanceof THREE.Scene);
    }

    /**
     * Convert quaternion to Euler angles
     * @param quaternion - Input quaternion
     * @param order - Euler order (default: 'XYZ')
     * @returns Euler angles
     */
    static quaternionToEuler(quaternion: THREE.Quaternion, order: THREE.EulerOrder = 'XYZ'): THREE.Euler {
        return new THREE.Euler().setFromQuaternion(quaternion, order);
    }

    /**
     * Convert Euler angles to quaternion
     * @param euler - Input Euler angles
     * @returns Quaternion
     */
    static eulerToQuaternion(euler: THREE.Euler): THREE.Quaternion {
        return new THREE.Quaternion().setFromEuler(euler);
    }
  
    static setWorldTransform(object: Object3D, matrixWorld: Matrix4) {
        object.matrixWorld.copy(matrixWorld);

        // Set object.matrix
        const parent = object.parent;
        if (parent) {
            parent.updateWorldMatrix(true, false);
            object.matrix.copy(parent.matrixWorld).invert();
            object.matrix.multiply(matrixWorld);
        } else {
            object.matrix.copy(matrixWorld);
        }

        object.matrix.decompose(object.position, object.quaternion, object.scale);
        object.matrixWorldNeedsUpdate = false;
    }
}

export default TransformUtils;