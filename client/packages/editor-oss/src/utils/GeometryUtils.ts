import {
    BufferGeometry,
    BoxGeometry,
    CircleGeometry,
    ConeGeometry,
    CylinderGeometry,
    DodecahedronGeometry,
    ExtrudeGeometry,
    IcosahedronGeometry,
    LatheGeometry,
    OctahedronGeometry,
    PlaneGeometry,
    PolyhedronGeometry,
    RingGeometry,
    ShapeGeometry,
    SphereGeometry,
    TetrahedronGeometry,
    TorusGeometry,
    TorusKnotGeometry,
    TubeGeometry,
} from "three";
import {ParametricGeometry} from "three/examples/jsm/geometries/ParametricGeometry.js";
import {TextGeometry} from "three/examples/jsm/geometries/TextGeometry.js";

type TypedArray =
    | Float32Array
    | Float64Array
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | BigInt64Array
    | BigUint64Array;

interface TypedArrayViewShim {
    byteOffset?: number;
    byteLength?: number;
    length?: number;
    BYTES_PER_ELEMENT?: number;
    buffer?: ArrayBuffer;
}

/**
 * Type guard to check if a geometry is a BoxGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a BoxGeometry
 */
function isBoxGeometry(geometry: BufferGeometry): geometry is BoxGeometry {
    return geometry instanceof BoxGeometry;
}

/**
 * Type guard to check if a geometry is a CircleGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a CircleGeometry
 */
function isCircleGeometry(geometry: BufferGeometry): geometry is CircleGeometry {
    return geometry instanceof CircleGeometry;
}

/**
 * Type guard to check if a geometry is a ConeGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a ConeGeometry
 */
function isConeGeometry(geometry: BufferGeometry): geometry is ConeGeometry {
    return geometry instanceof ConeGeometry;
}

/**
 * Type guard to check if a geometry is a CylinderGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a CylinderGeometry
 */
function isCylinderGeometry(geometry: BufferGeometry): geometry is CylinderGeometry {
    return geometry instanceof CylinderGeometry;
}

/**
 * Type guard to check if a geometry is a DodecahedronGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a DodecahedronGeometry
 */
function isDodecahedronGeometry(geometry: BufferGeometry): geometry is DodecahedronGeometry {
    return geometry instanceof DodecahedronGeometry;
}

/**
 * Type guard to check if a geometry is an ExtrudeGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is an ExtrudeGeometry
 */
function isExtrudeGeometry(geometry: BufferGeometry): geometry is ExtrudeGeometry {
    return geometry instanceof ExtrudeGeometry;
}

/**
 * Type guard to check if a geometry is an IcosahedronGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is an IcosahedronGeometry
 */
function isIcosahedronGeometry(geometry: BufferGeometry): geometry is IcosahedronGeometry {
    return geometry instanceof IcosahedronGeometry;
}

/**
 * Type guard to check if a geometry is a LatheGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a LatheGeometry
 */
function isLatheGeometry(geometry: BufferGeometry): geometry is LatheGeometry {
    return geometry instanceof LatheGeometry;
}

/**
 * Type guard to check if a geometry is an OctahedronGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is an OctahedronGeometry
 */
function isOctahedronGeometry(geometry: BufferGeometry): geometry is OctahedronGeometry {
    return geometry instanceof OctahedronGeometry;
}

/**
 * Type guard to check if a geometry is a ParametricGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a ParametricGeometry
 */
function isParametricGeometry(geometry: BufferGeometry): geometry is ParametricGeometry {
    return geometry instanceof ParametricGeometry;
}

/**
 * Type guard to check if a geometry is a PlaneGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a PlaneGeometry
 */
function isPlaneGeometry(geometry: BufferGeometry): geometry is PlaneGeometry {
    return geometry instanceof PlaneGeometry;
}

/**
 * Type guard to check if a geometry is a PolyhedronGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a PolyhedronGeometry
 */
function isPolyhedronGeometry(geometry: BufferGeometry): geometry is PolyhedronGeometry {
    return geometry instanceof PolyhedronGeometry;
}

/**
 * Type guard to check if a geometry is a RingGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a RingGeometry
 */
function isRingGeometry(geometry: BufferGeometry): geometry is RingGeometry {
    return geometry instanceof RingGeometry;
}

/**
 * Type guard to check if a geometry is a ShapeGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a ShapeGeometry
 */
function isShapeGeometry(geometry: BufferGeometry): geometry is ShapeGeometry {
    return geometry instanceof ShapeGeometry;
}

/**
 * Type guard to check if a geometry is a SphereGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a SphereGeometry
 */
function isSphereGeometry(geometry: BufferGeometry): geometry is SphereGeometry {
    return geometry instanceof SphereGeometry;
}

/**
 * Type guard to check if a geometry is a TetrahedronGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a TetrahedronGeometry
 */
function isTetrahedronGeometry(geometry: BufferGeometry): geometry is TetrahedronGeometry {
    return geometry instanceof TetrahedronGeometry;
}

/**
 * Type guard to check if a geometry is a TextGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a TextGeometry
 */
function isTextGeometry(geometry: BufferGeometry): geometry is TextGeometry {
    return geometry instanceof TextGeometry;
}

/**
 * Type guard to check if a geometry is a TorusGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a TorusGeometry
 */
function isTorusGeometry(geometry: BufferGeometry): geometry is TorusGeometry {
    return geometry instanceof TorusGeometry;
}

/**
 * Type guard to check if a geometry is a TorusKnotGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a TorusKnotGeometry
 */
function isTorusKnotGeometry(geometry: BufferGeometry): geometry is TorusKnotGeometry {
    return geometry instanceof TorusKnotGeometry;
}

/**
 * Type guard to check if a geometry is a TubeGeometry
 * @param geometry - The geometry to check
 * @returns True if the geometry is a TubeGeometry
 */
function isTubeGeometry(geometry: BufferGeometry): geometry is TubeGeometry {
    return geometry instanceof TubeGeometry;
}

/**
 * Computes a hash for a geometry based on its position and index attributes.
 * @param geometry - The geometry to hash
 * @returns The computed hash string
 */
function hashGeometry(geometry: BufferGeometry): string {
    const positionAttr = geometry.attributes.position;
    if (!positionAttr) {
        return "";
    }

    const fnv1a = (typed: TypedArray | ArrayBufferView): string => {
        const anyView = typed as TypedArrayViewShim;
        const byteOffset = anyView.byteOffset ?? 0;
        const byteLength =
            anyView.byteLength ?? (anyView.length ? anyView.length * (anyView.BYTES_PER_ELEMENT || 1) : 0);
        const buffer = anyView.buffer || (typed as TypedArrayViewShim).buffer;
        const view = new Uint8Array(buffer as ArrayBuffer, byteOffset, byteLength);
        let hash = 0x811c9dc5;
        for (let i = 0; i < view.length; i++) {
            hash ^= view[i]!;
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        hash >>>= 0;
        return hash.toString(16).padStart(8, "0");
    };

    const positionHash = fnv1a(positionAttr.array);
    let indexHash = "";
    if (geometry.index && geometry.index.array) {
        try {
            indexHash = fnv1a(geometry.index.array);
        } catch {
            indexHash = "";
        }
    }
    return indexHash ? `${positionHash}_${indexHash}` : positionHash;
}

/**
 * Checks if a geometry is one of Three.js's built-in geometries
 * @param geometry - The geometry to check
 * @returns True if the geometry is a built-in geometry
 */
function isBuildInGeometry(geometry: BufferGeometry): boolean {
    return (
        isBoxGeometry(geometry) ||
        isCircleGeometry(geometry) ||
        isConeGeometry(geometry) ||
        isCylinderGeometry(geometry) ||
        isDodecahedronGeometry(geometry) ||
        isExtrudeGeometry(geometry) ||
        isIcosahedronGeometry(geometry) ||
        isLatheGeometry(geometry) ||
        isOctahedronGeometry(geometry) ||
        isParametricGeometry(geometry) ||
        isPlaneGeometry(geometry) ||
        isPolyhedronGeometry(geometry) ||
        isRingGeometry(geometry) ||
        isShapeGeometry(geometry) ||
        isSphereGeometry(geometry) ||
        isTetrahedronGeometry(geometry) ||
        isTextGeometry(geometry) ||
        isTorusGeometry(geometry) ||
        isTorusKnotGeometry(geometry) ||
        isTubeGeometry(geometry)
    );
}

/**
 * Geometry utility class
 */
const GeometryUtils = {
    hashGeometry,
    isBuildInGeometry,
    isBoxGeometry,
    isCircleGeometry,
    isConeGeometry,
    isCylinderGeometry,
    isDodecahedronGeometry,
    isExtrudeGeometry,
    isIcosahedronGeometry,
    isLatheGeometry,
    isOctahedronGeometry,
    isParametricGeometry,
    isPlaneGeometry,
    isPolyhedronGeometry,
    isRingGeometry,
    isShapeGeometry,
    isSphereGeometry,
    isTetrahedronGeometry,
    isTextGeometry,
    isTorusGeometry,
    isTorusKnotGeometry,
    isTubeGeometry,
};

export default GeometryUtils;
