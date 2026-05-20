import {Box3, Mesh, Object3D, Vector3, Vector3Like} from "three";

export type CapsuleShape = {
    radius: number;
    height: number;
    center: Vector3Like;
};

export default class BoundingBoxUtil {
    private static tmpVector = new Vector3();

    public static isInfiniteBox(box: Box3) {
        return box.min.x === Infinity || box.min.x === -Infinity ||
               box.min.y === Infinity || box.min.y === -Infinity ||
               box.min.z === Infinity || box.min.z === -Infinity ||
               box.max.x === Infinity || box.max.x === -Infinity ||
               box.max.y === Infinity || box.max.y === -Infinity ||
               box.max.z === Infinity || box.max.z === -Infinity;
    }

    public static getBox(object: Object3D, skipInvisible = false): Box3 {
        const box = new Box3();
        const childBox = new Box3();

        const traverseFn = (child: Object3D) => {
            // This logic is based on THREE.Box3.setFromObject() but can be used
            // in either traverse() or traverseVisible() whereas setFromObject()
            // cannot filter out invisible objects.
            const childAsAny = child as any;
            const geometry = childAsAny.geometry;
            if (!geometry) {
                return;
            }
            if (childAsAny.isSkinnedMesh) {
                // For SkinnedMesh, standard geometry bounding box is for the bind pose.
                // We use computeBoundingBox() on the mesh itself if available (modern Three.js)
                // or fall back to bone-based approximation.
                if (childAsAny.computeBoundingBox) {
                    childAsAny.computeBoundingBox();
                    if (childAsAny.boundingBox) {
                        childBox.copy(childAsAny.boundingBox);
                    } else {
                        if (geometry.boundingBox === null) geometry.computeBoundingBox();
                        childBox.copy(geometry.boundingBox);
                    }
                } else {
                    // Fallback for older Three.js or if computeBoundingBox fails
                    if (geometry.boundingBox === null) geometry.computeBoundingBox();
                    childBox.copy(geometry.boundingBox);
                }
            } else if (childAsAny.boundingBox !== undefined) {
                if (childAsAny.boundingBox === null) {
                    childAsAny.computeBoundingBox();
                }
                childBox.copy(childAsAny.boundingBox);
            } else {
                if (geometry.boundingBox === null) {
                    geometry.computeBoundingBox();
                }
                childBox.copy(geometry.boundingBox);
            }

            childBox.applyMatrix4(child.matrixWorld);
            box.union(childBox);
        };

        if (skipInvisible) {
            object.traverseVisible(traverseFn);
        } else {
            object.traverse(traverseFn);
        }

        return box;
    }

    /**
     * Return the local bounding box of an object and its children.
     * 
     * @param object - The object to get the local bounding box for
     * @param skipInvisible - Whether to skip invisible objects
     * @returns The local bounding box of the object.
     */
    public static getBoxWithoutTransform(object: Object3D, skipInvisible = false): Box3 {
        const parent = object.parent;
        if (parent) {
            object.parent = null;
        }

        const prevPosition = object.position.clone();
        const prevRotation = object.rotation.clone();
        const prevScale = object.scale.clone();
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);

        object.updateMatrixWorld(true);

        const box = BoundingBoxUtil.getBox(object, skipInvisible);

        object.position.copy(prevPosition);
        object.rotation.copy(prevRotation);
        object.scale.copy(prevScale);

        if (parent) {
            object.parent = parent;
        }

        // World matrices will need to be updated
        object.matrixWorldNeedsUpdate = true;
        object.traverse((child) => {
            child.matrixWorldNeedsUpdate = true;
        });

        return box;
    }

    /**
     * Calculates and returns the radius of the bounding sphere of an Object3D with its children.
     *
     * @param object - The Object3D for which to calculate the radius.
     * @param skipInvisible - Whether to skip invisible objects.
     * @returns The radius of the Object3D.
     */
    public static getRadius(object: Object3D, skipInvisible = false): number {
        if (skipInvisible && !object.visible) {
            return 0;
        }

        // TODO: this doesn't take into account child meshes and does not
        // produce a tight sphere when the object's geometry is not centered
        // around the origin.
        const geometry = (object as Mesh).geometry;
        if (!geometry) {
            return 0;
        }

        geometry.computeBoundingSphere();
        const scale = Math.max(object.scale.x, object.scale.y, object.scale.z);

        return (geometry.boundingSphere?.radius || 0) * scale;
    }

    /**
     * Return the local bounding radius of an object and its children.
     * 
     * @remarks
     * This may not produce a tight sphere when the object is not centered
     * around the origin.
     * 
     * @param object - The object to get the local bounding radius for
     * @param skipInvisible - Whether to skip invisible objects
     * @returns The local bounding radius of the object.
     */
    public static getRadiusWithoutTransform(object: Object3D, skipInvisible = false): number {
        const parent = object.parent;
        if (parent) {
            object.parent = null;
        }

        const prevPosition = object.position.clone();
        const prevRotation = object.rotation.clone();
        const prevScale = object.scale.clone();
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);

        object.updateMatrixWorld(true);

        const radius = this.getRadius(object, skipInvisible);

        object.position.copy(prevPosition);
        object.rotation.copy(prevRotation);
        object.scale.copy(prevScale);

        if (parent) {
            object.parent = parent;
        }

        // World matrices will need to be updated
        object.matrixWorldNeedsUpdate = true;
        object.traverse((child) => {
            child.matrixWorldNeedsUpdate = true;
        });

        return radius;
    }

    /**
     * Calculates the capsule shape parameters for a given Object3D with its children.
     *
     * @param object - The Object3D from which to get the capsule representation.
     * @param skipInvisible - Whether to skip invisible objects.
     * @returns The capsule representation of the object.
     */
    public static getCapsule(object: Object3D, skipInvisible = false): CapsuleShape {
        const box = BoundingBoxUtil.getBox(object, skipInvisible);
        box.getCenter(BoundingBoxUtil.tmpVector);
        const width = box.max.x - box.min.x;
        const height = box.max.y - box.min.y;
        const length = box.max.z - box.min.z;
        const radius = Math.max(width, length) / 2;
        const capsuleHeight = height - 2 * radius;
        return {
            radius,
            height: capsuleHeight,
            center: {
                x: BoundingBoxUtil.tmpVector.x,
                y: BoundingBoxUtil.tmpVector.y,
                z: BoundingBoxUtil.tmpVector.z,
            },
        };
    }

    /**
     * Return the local bounding capsule of an object and its children.
     * 
     * @param object - The object to get the local bounding capsule for
     * @param skipInvisible - Whether to skip invisible objects
     * @returns The local bounding capsule of the object.
     */
    public static getCapsuleWithoutTransform(object: Object3D, skipInvisible = false): CapsuleShape {
        const parent = object.parent;
        if (parent) {
            object.parent = null;
        }

        const prevPosition = object.position.clone();
        const prevRotation = object.rotation.clone();
        const prevScale = object.scale.clone();
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);

        object.updateMatrixWorld(true);

        const capsule = this.getCapsule(object, skipInvisible);

        object.position.copy(prevPosition);
        object.rotation.copy(prevRotation);
        object.scale.copy(prevScale);

        if (parent) {
            object.parent = parent;
        }

        // World matrices will need to be updated
        object.matrixWorldNeedsUpdate = true;
        object.traverse((child) => {
            child.matrixWorldNeedsUpdate = true;
        });

        return capsule;
    }
    /**
     * Calculates the center of a collection of 3D objects.
     *
     * @param objects - An array of Object3D instances.
     * @returns The center point of the bounding box that encompasses all objects.
     */
    public static calculateObjectsCenter(objects: Object3D[]): Vector3 {
        if (!objects || objects.length === 0) {
            return new Vector3();
        }

        const box = new Box3();
        const center = new Vector3();

        objects.forEach(object => {
            // If the object does not have geometry, use its world position
            let hasGeometry = false;
            object.traverse(child => {
                if ((child as Mesh).geometry) {
                    hasGeometry = true;
                }
            });

            if (hasGeometry) {
                box.expandByObject(object);
            } else {
            // Add the object's position as a point in the bounding box
                const worldPos = new Vector3();
                object.getWorldPosition(worldPos);
                box.expandByPoint(worldPos);
            }
        });

        box.getCenter(center);
        return center;
    }

}
