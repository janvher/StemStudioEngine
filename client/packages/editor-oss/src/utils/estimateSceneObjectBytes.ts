type ArrayLikeWithBytes = {
    byteLength?: number;
    length?: number;
    BYTES_PER_ELEMENT?: number;
};

type GeometryLike = {
    isBufferGeometry?: boolean;
    attributes?: Record<string, {array?: ArrayLikeWithBytes} | undefined>;
    index?: {array?: ArrayLikeWithBytes} | null;
};

type ObjectLike = {
    isBatchedMesh?: boolean;
    isMesh?: boolean;
    geometry?: GeometryLike;
};

const getByteLength = (arrayLike?: ArrayLikeWithBytes) => {
    if (!arrayLike) return 0;
    if (typeof arrayLike.byteLength === "number") return arrayLike.byteLength;
    if (typeof arrayLike.length === "number" && typeof arrayLike.BYTES_PER_ELEMENT === "number") {
        return arrayLike.length * arrayLike.BYTES_PER_ELEMENT;
    }
    return 0;
};

export const estimateSceneObjectBytes = (object: ObjectLike): number => {
    if (object.isBatchedMesh) {
        return 0;
    }

    if (!object.isMesh || !object.geometry?.isBufferGeometry) {
        return 0;
    }

    let totalBytes = 0;
    for (const attribute of Object.values(object.geometry.attributes ?? {})) {
        totalBytes += getByteLength(attribute?.array);
    }

    totalBytes += getByteLength(object.geometry.index?.array);

    return totalBytes;
};
