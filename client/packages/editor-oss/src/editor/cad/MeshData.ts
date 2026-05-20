import {SerializedMeshData, SerializedMeshEdge, SerializedMeshFace, SerializedMeshVertex, MeshPositionLike} from "./types";

class Vertex {
    id: number;
    position: MeshPositionLike;
    edgeIds: Set<number>;
    faceIds: Set<number>;

    constructor(id: number, position: MeshPositionLike) {
        this.id = id;
        this.position = position;
        this.edgeIds = new Set();
        this.faceIds = new Set();
    }
}

class Edge {
    id: number;
    v1Id: number;
    v2Id: number;
    faceIds: Set<number>;

    constructor(id: number, v1Id: number, v2Id: number) {
        this.id = id;
        this.v1Id = v1Id;
        this.v2Id = v2Id;
        this.faceIds = new Set();
    }
}

class Face {
    id: number;
    vertexIds: number[];
    edgeIds: Set<number>;

    constructor(id: number, vertexIds: number[]) {
        this.id = id;
        this.vertexIds = vertexIds;
        this.edgeIds = new Set();
    }
}

export class MeshData {
    vertices: Map<number, Vertex> = new Map();
    edges: Map<number, Edge> = new Map();
    faces: Map<number, Face> = new Map();
    vertexIndexMap: Map<number, number[]> = new Map();
    bufferIndexToVertexId: Map<number, number> = new Map();
    nextVertexId = 0;
    nextEdgeId = 0;
    nextFaceId = 0;

    addVertex(position: MeshPositionLike): Vertex {
        const vertex = new Vertex(this.nextVertexId++, position);
        this.vertices.set(vertex.id, vertex);
        return vertex;
    }

    getVertex(vertexId: number): Vertex | undefined {
        return this.vertices.get(vertexId);
    }

    getEdge(v1Id: number, v2Id: number): Edge | undefined {
        const firstVertex = this.getVertex(v1Id);
        if (!firstVertex) {
            return undefined;
        }

        for (const edgeId of firstVertex.edgeIds) {
            const edge = this.edges.get(edgeId);
            if (!edge) {
                continue;
            }

            const matchesForward = edge.v1Id === v1Id && edge.v2Id === v2Id;
            const matchesReverse = edge.v1Id === v2Id && edge.v2Id === v1Id;
            if (matchesForward || matchesReverse) {
                return edge;
            }
        }

        return undefined;
    }

    addEdge(v1Id: number, v2Id: number): Edge {
        const existing = this.getEdge(v1Id, v2Id);
        if (existing) {
            return existing;
        }

        const edge = new Edge(this.nextEdgeId++, v1Id, v2Id);
        this.edges.set(edge.id, edge);

        const firstVertex = this.getVertex(v1Id);
        const secondVertex = this.getVertex(v2Id);
        firstVertex?.edgeIds.add(edge.id);
        secondVertex?.edgeIds.add(edge.id);

        return edge;
    }

    addFace(vertexIds: number[]): Face {
        const face = new Face(this.nextFaceId++, vertexIds);
        this.faces.set(face.id, face);

        for (let index = 0; index < vertexIds.length; index++) {
            const v1Id = vertexIds[index]!;
            const v2Id = vertexIds[(index + 1) % vertexIds.length]!;
            const edge = this.addEdge(v1Id, v2Id);
            face.edgeIds.add(edge.id);
            edge.faceIds.add(face.id);
        }

        for (const vertexId of vertexIds) {
            this.getVertex(vertexId)?.faceIds.add(face.id);
        }

        return face;
    }

    deleteFace(face: Face): void {
        for (const edgeId of face.edgeIds) {
            const edge = this.edges.get(edgeId);
            edge?.faceIds.delete(face.id);
        }

        for (const vertexId of face.vertexIds) {
            this.getVertex(vertexId)?.faceIds.delete(face.id);
        }

        this.faces.delete(face.id);
    }

    deleteEdge(edge: Edge): void {
        for (const faceId of Array.from(edge.faceIds)) {
            const face = this.faces.get(faceId);
            if (face) {
                this.deleteFace(face);
            }
        }

        this.getVertex(edge.v1Id)?.edgeIds.delete(edge.id);
        this.getVertex(edge.v2Id)?.edgeIds.delete(edge.id);
        this.edges.delete(edge.id);
    }

    deleteVertex(vertex: Vertex): void {
        for (const faceId of Array.from(vertex.faceIds)) {
            const face = this.faces.get(faceId);
            if (face) {
                this.deleteFace(face);
            }
        }

        for (const edgeId of Array.from(vertex.edgeIds)) {
            const edge = this.edges.get(edgeId);
            if (edge) {
                this.deleteEdge(edge);
            }
        }

        this.vertices.delete(vertex.id);
    }

    toJSON(): SerializedMeshData {
        const serializedVertices: [number, SerializedMeshVertex][] = Array.from(this.vertices.entries()).map(
            ([id, vertex]) => [
                id,
                {
                    id: vertex.id,
                    position: {...vertex.position},
                    edgeIds: Array.from(vertex.edgeIds),
                    faceIds: Array.from(vertex.faceIds),
                },
            ],
        );

        const serializedEdges: [number, SerializedMeshEdge][] = Array.from(this.edges.entries()).map(([id, edge]) => [
            id,
            {
                id: edge.id,
                v1Id: edge.v1Id,
                v2Id: edge.v2Id,
                faceIds: Array.from(edge.faceIds),
            },
        ]);

        const serializedFaces: [number, SerializedMeshFace][] = Array.from(this.faces.entries()).map(([id, face]) => [
            id,
            {
                id: face.id,
                vertexIds: [...face.vertexIds],
                edgeIds: Array.from(face.edgeIds),
            },
        ]);

        return {
            vertices: serializedVertices,
            edges: serializedEdges,
            faces: serializedFaces,
            vertexIndexMap: Array.from(this.vertexIndexMap.entries()).map(([key, value]) => [key, [...value]]),
            bufferIndexToVertexId: Array.from(this.bufferIndexToVertexId.entries()),
            nextVertexId: this.nextVertexId,
            nextEdgeId: this.nextEdgeId,
            nextFaceId: this.nextFaceId,
        };
    }

    static isSerializedMeshData(value: unknown): value is SerializedMeshData {
        if (!value || typeof value !== "object") {
            return false;
        }

        const candidate = value as Partial<SerializedMeshData>;
        return Array.isArray(candidate.vertices) && Array.isArray(candidate.edges) && Array.isArray(candidate.faces);
    }

    static fromJSON(raw: SerializedMeshData): MeshData {
        const meshData = new MeshData();
        meshData.nextVertexId = raw.nextVertexId ?? 0;
        meshData.nextEdgeId = raw.nextEdgeId ?? 0;
        meshData.nextFaceId = raw.nextFaceId ?? 0;

        meshData.vertices = new Map(
            raw.vertices.map(([id, vertex]) => {
                const hydratedVertex = new Vertex(vertex.id, {...vertex.position});
                hydratedVertex.edgeIds = new Set(vertex.edgeIds || []);
                hydratedVertex.faceIds = new Set(vertex.faceIds || []);
                return [id, hydratedVertex];
            }),
        );

        meshData.edges = new Map(
            raw.edges.map(([id, edge]) => {
                const hydratedEdge = new Edge(edge.id, edge.v1Id, edge.v2Id);
                hydratedEdge.faceIds = new Set(edge.faceIds || []);
                return [id, hydratedEdge];
            }),
        );

        meshData.faces = new Map(
            raw.faces.map(([id, face]) => {
                const hydratedFace = new Face(face.id, [...face.vertexIds]);
                hydratedFace.edgeIds = new Set(face.edgeIds || []);
                return [id, hydratedFace];
            }),
        );

        meshData.vertexIndexMap = new Map(raw.vertexIndexMap.map(([key, value]) => [key, [...value]]));
        meshData.bufferIndexToVertexId = new Map(raw.bufferIndexToVertexId);

        return meshData;
    }
}
