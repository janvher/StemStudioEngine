import * as THREE from "three";

/**
 * Result of computing an oriented bounding box for an Object3D.
 *
 * - `box` is an axis-aligned Box3 expressed in a local frame that has the
 *   object's world position and rotation removed but its world scale
 *   preserved. In that frame the box is tight to the geometry's natural
 *   axes.
 * - `basis` is the position+rotation of the object in world space (no
 *   scale), so `basis * compose(center, identity, size)` reconstructs the
 *   oriented box in world space.
 */
export interface OrientedBoxResult {
    box: THREE.Box3;
    basis: THREE.Matrix4;
    hasGeometry: boolean;
}

const _pos = new THREE.Vector3();
const _rot = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);
const _v = new THREE.Vector3();
const _skinnedVertex = new THREE.Vector3();
const _bounds = new THREE.Box3();
const _inv = new THREE.Matrix4();
const _childMat = new THREE.Matrix4();

type ObjectWithBounds = THREE.Object3D & {
    boundingBox?: THREE.Box3 | null;
    computeBoundingBox?: () => void;
    getBoundingBox?: (centersOnly?: boolean) => THREE.Box3;
};

const isSkinnedMesh = (object: THREE.Object3D): object is THREE.SkinnedMesh => {
    return (object as THREE.SkinnedMesh).isSkinnedMesh === true;
};

const expandBoxCorners = (
    box: THREE.Box3,
    matrix: THREE.Matrix4,
    target: THREE.Box3,
): boolean => {
    if (box.isEmpty()) return false;

    for (let i = 0; i < 8; i++) {
        _v.set(
            i & 1 ? box.max.x : box.min.x,
            i & 2 ? box.max.y : box.min.y,
            i & 4 ? box.max.z : box.min.z,
        ).applyMatrix4(matrix);
        target.expandByPoint(_v);
    }

    return true;
};

const expandSkinnedMeshVertices = (
    mesh: THREE.SkinnedMesh,
    orientedInverse: THREE.Matrix4,
    target: THREE.Box3,
): boolean => {
    const positions = mesh.geometry.getAttribute("position");
    if (!positions) return false;

    _childMat.multiplyMatrices(orientedInverse, mesh.matrixWorld);

    let expanded = false;
    for (let i = 0; i < positions.count; i++) {
        mesh.getVertexPosition(i, _skinnedVertex);
        _skinnedVertex.applyMatrix4(_childMat);
        target.expandByPoint(_skinnedVertex);
        expanded = true;
    }

    return expanded;
};

export const createOrientedBoxResult = (): OrientedBoxResult => ({
    box: new THREE.Box3(),
    basis: new THREE.Matrix4(),
    hasGeometry: false,
});

export const computeOrientedBox = (
    object: THREE.Object3D,
    target: OrientedBoxResult = createOrientedBoxResult(),
): OrientedBoxResult => {
    object.updateMatrixWorld(true);
    object.matrixWorld.decompose(_pos, _rot, _scl);
    target.basis.compose(_pos, _rot, _one);
    _inv.copy(target.basis).invert();

    target.box.makeEmpty();
    let hasGeometry = false;

    object.traverse(child => {
        const mesh = child as THREE.Mesh;
        const geom = mesh.geometry;
        const childWithBounds = child as ObjectWithBounds;

        if (geom && isSkinnedMesh(child)) {
            if (expandSkinnedMeshVertices(child, _inv, target.box)) {
                hasGeometry = true;
            }
            return;
        }

        _bounds.makeEmpty();

        if (typeof childWithBounds.getBoundingBox === "function") {
            try {
                _bounds.copy(childWithBounds.getBoundingBox(false));
            } catch {
                _bounds.makeEmpty();
            }
        }

        if (_bounds.isEmpty() && childWithBounds.boundingBox !== undefined) {
            if (childWithBounds.boundingBox === null) {
                childWithBounds.computeBoundingBox?.();
            }
            if (childWithBounds.boundingBox) {
                _bounds.copy(childWithBounds.boundingBox);
            }
        }

        if (_bounds.isEmpty() && geom) {
            if (!geom.boundingBox) geom.computeBoundingBox();
            if (geom.boundingBox) {
                _bounds.copy(geom.boundingBox);
            }
        }

        if (_bounds.isEmpty()) return;

        _childMat.multiplyMatrices(_inv, child.matrixWorld);
        if (expandBoxCorners(_bounds, _childMat, target.box)) {
            hasGeometry = true;
        }
    });

    target.hasGeometry = hasGeometry;
    return target;
};

/**
 * Returns the oriented (object-aligned) size of an Object3D's geometry in
 * world units. Unlike `Box3.setFromObject`, this is invariant to the
 * object's world rotation: it gives the size you would see if the object
 * were aligned to world axes.
 *
 * @param object
 * @param target
 * @returns
 */
export const computeOrientedSize = (
    object: THREE.Object3D,
    target: THREE.Vector3 = new THREE.Vector3(),
): THREE.Vector3 => {
    const result = computeOrientedBox(object);
    if (!result.hasGeometry || result.box.isEmpty()) {
        return target.set(0, 0, 0);
    }
    return result.box.getSize(target);
};
