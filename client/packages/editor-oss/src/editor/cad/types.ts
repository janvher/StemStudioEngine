export type CADTool = "select" | "move" | "rotate" | "scale" | "extrude" | "inset" | "bevel" | "annotate";

export type CADSelectionMode = "object" | "vertex" | "edge" | "face";

export type CADSelectionShape = "box" | "lasso";

export type CADAxisConstraint = "x" | "y" | "z";

export interface MeshPositionLike {
    x: number;
    y: number;
    z: number;
}

export interface SerializedMeshVertex {
    id: number;
    position: MeshPositionLike;
    edgeIds: number[];
    faceIds: number[];
}

export interface SerializedMeshEdge {
    id: number;
    v1Id: number;
    v2Id: number;
    faceIds: number[];
}

export interface SerializedMeshFace {
    id: number;
    vertexIds: number[];
    edgeIds: number[];
}

export interface SerializedMeshData {
    vertices: [number, SerializedMeshVertex][];
    edges: [number, SerializedMeshEdge][];
    faces: [number, SerializedMeshFace][];
    vertexIndexMap: [number, number[]][];
    bufferIndexToVertexId: [number, number][];
    nextVertexId: number;
    nextEdgeId: number;
    nextFaceId: number;
}
