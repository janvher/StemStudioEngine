import * as THREE from "three";

import {MeshData} from "./MeshData";
import {SerializedMeshData} from "./types";

const DEFAULT_TOLERANCE = 1e-5;
const DEFAULT_COPLANAR_DISTANCE_TOLERANCE = 1e-4;
const DEFAULT_COPLANAR_NORMAL_DOT = 0.9995;
const QUAD_COMPATIBLE_GEOMETRY_TYPES = new Set([
    "PlaneGeometry",
    "PlaneBufferGeometry",
    "BoxGeometry",
    "BoxBufferGeometry",
]);

type TriangleCandidate = {
    vertexIds: [number, number, number];
    normal: THREE.Vector3;
    planeConstant: number;
};

/**
 *
 * @param value
 * @param tolerance
 */
function quantize(value: number, tolerance: number): number {
    return Math.round(value / tolerance);
}

/**
 *
 * @param position
 * @param tolerance
 */
function getVertexKey(position: THREE.Vector3Like, tolerance: number): string {
    return `${quantize(position.x, tolerance)}:${quantize(position.y, tolerance)}:${quantize(position.z, tolerance)}`;
}

/**
 *
 * @param geometry
 */
function getTriangleIndices(geometry: THREE.BufferGeometry): number[] {
    if (geometry.index) {
        return Array.from(geometry.index.array as Iterable<number>);
    }

    const position = geometry.getAttribute("position");
    return Array.from({length: position.count}, (_, index) => index);
}

/**
 *
 * @param meshData
 * @param bufferIndices
 */
function getVertexIdsForBufferIndices(meshData: MeshData, bufferIndices: number[]): number[] | null {
    const vertexIds = bufferIndices.map(index => meshData.bufferIndexToVertexId.get(index));
    if (vertexIds.some(vertexId => vertexId === undefined)) {
        return null;
    }

    return vertexIds as number[];
}

/**
 *
 * @param meshData
 * @param vertexIds
 */
function computeNormalFromVertexIds(meshData: MeshData, vertexIds: number[]): THREE.Vector3 {
    if (vertexIds.length < 3) {
        return new THREE.Vector3(0, 0, 1);
    }

    const p0 = meshData.getVertex(vertexIds[0]!)?.position;
    const p1 = meshData.getVertex(vertexIds[1]!)?.position;
    const p2 = meshData.getVertex(vertexIds[2]!)?.position;
    if (!p0 || !p1 || !p2) {
        return new THREE.Vector3(0, 0, 1);
    }

    return new THREE.Vector3()
        .subVectors(new THREE.Vector3(p1.x, p1.y, p1.z), new THREE.Vector3(p0.x, p0.y, p0.z))
        .cross(new THREE.Vector3().subVectors(new THREE.Vector3(p2.x, p2.y, p2.z), new THREE.Vector3(p0.x, p0.y, p0.z)))
        .normalize();
}

/**
 *
 * @param meshData
 * @param vertexIds
 * @param referenceNormal
 */
function orderFaceVertexIds(meshData: MeshData, vertexIds: number[], referenceNormal?: THREE.Vector3): number[] | null {
    const uniqueVertexIds = Array.from(new Set(vertexIds));
    if (uniqueVertexIds.length < 3) {
        return null;
    }

    const points = uniqueVertexIds
        .map(vertexId => {
            const vertex = meshData.getVertex(vertexId);
            if (!vertex) {
                return null;
            }

            return {
                vertexId,
                point: new THREE.Vector3(vertex.position.x, vertex.position.y, vertex.position.z),
            };
        })
        .filter((entry): entry is {vertexId: number; point: THREE.Vector3} => !!entry);

    if (points.length < 3) {
        return null;
    }

    const centroid = new THREE.Vector3();
    points.forEach(({point}) => centroid.add(point));
    centroid.multiplyScalar(1 / points.length);

    const normal = (referenceNormal && referenceNormal.lengthSq() > 0
        ? referenceNormal.clone()
        : computeNormalFromVertexIds(meshData, uniqueVertexIds)
    ).normalize();

    if (normal.lengthSq() === 0) {
        return null;
    }

    const tangent = new THREE.Vector3();
    if (Math.abs(normal.z) < 0.9) {
        tangent.set(0, 0, 1).cross(normal).normalize();
    } else {
        tangent.set(0, 1, 0).cross(normal).normalize();
    }
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

    const ordered = points
        .map(entry => {
            const offset = entry.point.clone().sub(centroid);
            return {
                vertexId: entry.vertexId,
                angle: Math.atan2(offset.dot(bitangent), offset.dot(tangent)),
            };
        })
        .sort((a, b) => a.angle - b.angle)
        .map(entry => entry.vertexId);

    const orderedNormal = computeNormalFromVertexIds(meshData, ordered);
    if (orderedNormal.lengthSq() > 0 && orderedNormal.dot(normal) < 0) {
        ordered.reverse();
    }

    return ordered;
}

/**
 *
 * @param meshData
 * @param triangleIndices
 */
function addTriangleFaces(meshData: MeshData, triangleIndices: number[]) {
    for (let triangleIndex = 0; triangleIndex + 2 < triangleIndices.length; triangleIndex += 3) {
        const triangleBufferIndices = [
            triangleIndices[triangleIndex]!,
            triangleIndices[triangleIndex + 1]!,
            triangleIndices[triangleIndex + 2]!,
        ];
        const vertexIds = getVertexIdsForBufferIndices(meshData, triangleBufferIndices);
        if (!vertexIds || new Set(vertexIds).size < 3) {
            continue;
        }

        meshData.addFace(vertexIds);
    }
}

/**
 *
 * @param v1Id
 * @param v2Id
 */
function getUndirectedEdgeKey(v1Id: number, v2Id: number): string {
    return v1Id < v2Id ? `${v1Id}:${v2Id}` : `${v2Id}:${v1Id}`;
}

/**
 *
 * @param meshData
 * @param triangleIndices
 */
function buildTriangleCandidates(meshData: MeshData, triangleIndices: number[]): TriangleCandidate[] {
    const triangles: TriangleCandidate[] = [];

    for (let triangleIndex = 0; triangleIndex + 2 < triangleIndices.length; triangleIndex += 3) {
        const triangleBufferIndices = [
            triangleIndices[triangleIndex]!,
            triangleIndices[triangleIndex + 1]!,
            triangleIndices[triangleIndex + 2]!,
        ];
        const vertexIds = getVertexIdsForBufferIndices(meshData, triangleBufferIndices);
        if (!vertexIds || new Set(vertexIds).size < 3) {
            continue;
        }

        const triangleVertexIds = [vertexIds[0]!, vertexIds[1]!, vertexIds[2]!] as [number, number, number];
        const normal = computeNormalFromVertexIds(meshData, triangleVertexIds);
        if (normal.lengthSq() === 0) {
            continue;
        }

        const firstVertex = meshData.getVertex(triangleVertexIds[0]);
        if (!firstVertex) {
            continue;
        }

        triangles.push({
            vertexIds: triangleVertexIds,
            normal,
            planeConstant: normal.dot(new THREE.Vector3(firstVertex.position.x, firstVertex.position.y, firstVertex.position.z)),
        });
    }

    return triangles;
}

/**
 *
 * @param meshData
 * @param triangle
 * @param referenceNormal
 * @param referencePlaneConstant
 * @param tolerance
 */
function isTriangleCoplanarWithReference(
    meshData: MeshData,
    triangle: TriangleCandidate,
    referenceNormal: THREE.Vector3,
    referencePlaneConstant: number,
    tolerance: number,
): boolean {
    if (triangle.normal.dot(referenceNormal) < DEFAULT_COPLANAR_NORMAL_DOT) {
        return false;
    }

    return triangle.vertexIds.every(vertexId => {
        const vertex = meshData.getVertex(vertexId);
        if (!vertex) {
            return false;
        }

        const point = new THREE.Vector3(vertex.position.x, vertex.position.y, vertex.position.z);
        return Math.abs(referenceNormal.dot(point) - referencePlaneConstant) <= tolerance;
    });
}

/**
 *
 * @param meshData
 * @param vertexIds
 * @param referenceNormal
 */
function orientFaceVertexIds(meshData: MeshData, vertexIds: number[], referenceNormal: THREE.Vector3): number[] {
    const oriented = [...vertexIds];
    const orderedNormal = computeNormalFromVertexIds(meshData, oriented);
    if (orderedNormal.lengthSq() > 0 && orderedNormal.dot(referenceNormal) < 0) {
        oriented.reverse();
    }
    return oriented;
}

/**
 *
 * @param meshData
 * @param triangles
 * @param referenceNormal
 */
function buildMergedBoundaryFace(meshData: MeshData, triangles: TriangleCandidate[], referenceNormal: THREE.Vector3): number[] | null {
    const boundaryEdges = new Map<string, [number, number]>();

    triangles.forEach(triangle => {
        const triangleEdges: [number, number][] = [
            [triangle.vertexIds[0], triangle.vertexIds[1]],
            [triangle.vertexIds[1], triangle.vertexIds[2]],
            [triangle.vertexIds[2], triangle.vertexIds[0]],
        ];

        triangleEdges.forEach(([v1Id, v2Id]) => {
            const key = getUndirectedEdgeKey(v1Id, v2Id);
            if (boundaryEdges.has(key)) {
                boundaryEdges.delete(key);
                return;
            }

            boundaryEdges.set(key, [v1Id, v2Id]);
        });
    });

    if (boundaryEdges.size < 3) {
        return null;
    }

    const adjacency = new Map<number, number[]>();
    boundaryEdges.forEach(([v1Id, v2Id]) => {
        adjacency.set(v1Id, [...(adjacency.get(v1Id) || []), v2Id]);
        adjacency.set(v2Id, [...(adjacency.get(v2Id) || []), v1Id]);
    });

    if (Array.from(adjacency.values()).some(neighbors => neighbors.length !== 2)) {
        return null;
    }

    const startVertexId = boundaryEdges.values().next().value?.[0];
    if (typeof startVertexId !== "number") {
        return null;
    }

    const ordered: number[] = [startVertexId];
    const visitedEdges = new Set<string>();
    let previousVertexId: number | null = null;
    let currentVertexId = startVertexId;

    while (true) {
        const neighbors = adjacency.get(currentVertexId);
        if (!neighbors || neighbors.length !== 2) {
            return null;
        }

        const nextVertexId = neighbors.find(vertexId => vertexId !== previousVertexId);
        if (nextVertexId === undefined) {
            return null;
        }

        const edgeKey = getUndirectedEdgeKey(currentVertexId, nextVertexId);
        if (visitedEdges.has(edgeKey)) {
            if (nextVertexId !== startVertexId || visitedEdges.size !== boundaryEdges.size) {
                return null;
            }
            break;
        }

        visitedEdges.add(edgeKey);
        previousVertexId = currentVertexId;
        currentVertexId = nextVertexId;

        if (currentVertexId === startVertexId) {
            if (visitedEdges.size !== boundaryEdges.size) {
                return null;
            }
            break;
        }

        ordered.push(currentVertexId);
    }

    if (ordered.length < 3 || new Set(ordered).size !== ordered.length) {
        return null;
    }

    return orientFaceVertexIds(meshData, ordered, referenceNormal);
}

/**
 *
 * @param meshData
 * @param triangleIndices
 * @param tolerance
 */
function addMergedCoplanarFaces(
    meshData: MeshData,
    triangleIndices: number[],
    tolerance = DEFAULT_COPLANAR_DISTANCE_TOLERANCE,
) {
    const triangles = buildTriangleCandidates(meshData, triangleIndices);
    if (triangles.length === 0) {
        return;
    }

    const edgeToTriangleIndices = new Map<string, number[]>();
    triangles.forEach((triangle, triangleIndex) => {
        const triangleEdges = [
            [triangle.vertexIds[0], triangle.vertexIds[1]],
            [triangle.vertexIds[1], triangle.vertexIds[2]],
            [triangle.vertexIds[2], triangle.vertexIds[0]],
        ] as const;

        triangleEdges.forEach(([v1Id, v2Id]) => {
            const key = getUndirectedEdgeKey(v1Id, v2Id);
            edgeToTriangleIndices.set(key, [...(edgeToTriangleIndices.get(key) || []), triangleIndex]);
        });
    });

    const visitedTriangles = new Set<number>();

    triangles.forEach((triangle, triangleIndex) => {
        if (visitedTriangles.has(triangleIndex)) {
            return;
        }

        const componentTriangleIndices: number[] = [];
        const queue = [triangleIndex];
        visitedTriangles.add(triangleIndex);

        while (queue.length > 0) {
            const currentTriangleIndex = queue.pop()!;
            const currentTriangle = triangles[currentTriangleIndex]!;
            componentTriangleIndices.push(currentTriangleIndex);

            const triangleEdges = [
                [currentTriangle.vertexIds[0], currentTriangle.vertexIds[1]],
                [currentTriangle.vertexIds[1], currentTriangle.vertexIds[2]],
                [currentTriangle.vertexIds[2], currentTriangle.vertexIds[0]],
            ] as const;

            triangleEdges.forEach(([v1Id, v2Id]) => {
                const neighbors = edgeToTriangleIndices.get(getUndirectedEdgeKey(v1Id, v2Id)) || [];
                neighbors.forEach(neighborTriangleIndex => {
                    if (visitedTriangles.has(neighborTriangleIndex)) {
                        return;
                    }

                    const neighborTriangle = triangles[neighborTriangleIndex]!;
                    if (!isTriangleCoplanarWithReference(
                        meshData,
                        neighborTriangle,
                        triangle.normal,
                        triangle.planeConstant,
                        tolerance,
                    )) {
                        return;
                    }

                    visitedTriangles.add(neighborTriangleIndex);
                    queue.push(neighborTriangleIndex);
                });
            });
        }

        const componentTriangles = componentTriangleIndices.map(index => triangles[index]!);
        const mergedFaceVertexIds = componentTriangles.length > 1
            ? buildMergedBoundaryFace(meshData, componentTriangles, triangle.normal)
            : null;

        if (mergedFaceVertexIds && mergedFaceVertexIds.length >= 3) {
            meshData.addFace(mergedFaceVertexIds);
            return;
        }

        componentTriangles.forEach(componentTriangle => {
            meshData.addFace([...componentTriangle.vertexIds]);
        });
    });
}

/**
 *
 * @param meshData
 * @param triangleIndices
 */
function addPrimitiveQuadFaces(meshData: MeshData, triangleIndices: number[]) {
    for (let chunkStart = 0; chunkStart + 5 < triangleIndices.length; chunkStart += 6) {
        const quadBufferIndices = triangleIndices.slice(chunkStart, chunkStart + 6);
        const vertexIds = getVertexIdsForBufferIndices(meshData, quadBufferIndices);
        if (!vertexIds) {
            continue;
        }

        const uniqueVertexIds = Array.from(new Set(vertexIds));
        if (uniqueVertexIds.length !== 4) {
            addTriangleFaces(meshData, quadBufferIndices);
            continue;
        }

        const referenceNormal = computeNormalFromVertexIds(meshData, vertexIds.slice(0, 3));
        const orderedVertexIds = orderFaceVertexIds(meshData, uniqueVertexIds, referenceNormal);
        if (!orderedVertexIds || orderedVertexIds.length !== 4) {
            addTriangleFaces(meshData, quadBufferIndices);
            continue;
        }

        meshData.addFace(orderedVertexIds);
    }
}

/**
 *
 * @param geometry
 * @param meshData
 */
function shouldRegenerateQuadPrimitiveMeshData(geometry: THREE.BufferGeometry, meshData: MeshData): boolean {
    return QUAD_COMPATIBLE_GEOMETRY_TYPES.has(geometry.type) && Array.from(meshData.faces.values()).every(face => face.vertexIds.length === 3);
}

/**
 *
 * @param geometry
 * @param tolerance
 */
export function createMeshDataFromGeometry(
    geometry: THREE.BufferGeometry,
    tolerance = DEFAULT_TOLERANCE,
): MeshData {
    const positionAttribute = geometry.getAttribute("position");
    const meshData = new MeshData();

    if (!positionAttribute) {
        return meshData;
    }

    const uniqueVertexIds = new Map<string, number>();
    const localPosition = new THREE.Vector3();
    const triangleIndices = getTriangleIndices(geometry);

    for (let bufferIndex = 0; bufferIndex < positionAttribute.count; bufferIndex++) {
        localPosition.fromBufferAttribute(positionAttribute, bufferIndex);
        const key = getVertexKey(localPosition, tolerance);

        let vertexId = uniqueVertexIds.get(key);
        if (vertexId === undefined) {
            const vertex = meshData.addVertex({
                x: localPosition.x,
                y: localPosition.y,
                z: localPosition.z,
            });
            vertexId = vertex.id;
            uniqueVertexIds.set(key, vertexId);
        }

        const indices = meshData.vertexIndexMap.get(vertexId) || [];
        indices.push(bufferIndex);
        meshData.vertexIndexMap.set(vertexId, indices);
        meshData.bufferIndexToVertexId.set(bufferIndex, vertexId);
    }

    if (QUAD_COMPATIBLE_GEOMETRY_TYPES.has(geometry.type) && triangleIndices.length % 6 === 0) {
        addPrimitiveQuadFaces(meshData, triangleIndices);
    } else {
        addMergedCoplanarFaces(meshData, triangleIndices);
    }

    return meshData;
}

/**
 *
 * @param meshData
 */
export function createGeometryFromMeshData(meshData: MeshData): THREE.BufferGeometry {
    const positions: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    for (const face of meshData.faces.values()) {
        const faceVertexIds = face.vertexIds;
        if (faceVertexIds.length < 3) {
            continue;
        }

        const facePositions = faceVertexIds
            .map(vertexId => meshData.getVertex(vertexId))
            .filter((vertex): vertex is NonNullable<typeof vertex> => !!vertex);

        if (facePositions.length < 3) {
            continue;
        }

        for (const vertex of facePositions) {
            positions.push(vertex.position.x, vertex.position.y, vertex.position.z);
        }

        for (let index = 1; index < facePositions.length - 1; index++) {
            indices.push(vertexOffset, vertexOffset + index, vertexOffset + index + 1);
        }

        vertexOffset += facePositions.length;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

/**
 *
 * @param raw
 */
export function rehydrateMeshData(raw: SerializedMeshData | MeshData | null | undefined): MeshData | null {
    if (!raw) {
        return null;
    }

    if (raw instanceof MeshData) {
        return raw;
    }

    if (!MeshData.isSerializedMeshData(raw)) {
        return null;
    }

    return MeshData.fromJSON(raw);
}

/**
 *
 * @param object
 */
export function ensureObjectMeshData(object: THREE.Object3D | null | undefined): SerializedMeshData | null {
    if (!(object instanceof THREE.Mesh) || !object.geometry) {
        return null;
    }

    const existing = rehydrateMeshData(object.userData.meshData);
    if (existing && !shouldRegenerateQuadPrimitiveMeshData(object.geometry, existing)) {
        const serializedExisting = existing.toJSON();
        object.userData.meshData = serializedExisting;
        return serializedExisting;
    }

    const meshData = createMeshDataFromGeometry(object.geometry);
    const serialized = meshData.toJSON();
    object.userData.meshData = serialized;
    return serialized;
}
