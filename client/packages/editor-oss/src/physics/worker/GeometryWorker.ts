/// <reference no-default-lib="true"/>
/// <reference lib="webworker" />
/// <reference lib="es2015" />
import { expose } from "comlink";
import { HullCompute, type SerializableGeometry } from "../hull/HullCompute";

export type { SerializableGeometry };

export interface ConvexHullResult {
    vertices: number[];
}

export interface ConcaveHullResult {
    verticesArray: number[][];
    indicesArray: number[][];
}

const api = {
    computeConvexHull(
        geometries: SerializableGeometry[],
        simplifyFactor: number,
        userShapeScale: { x: number; y: number; z: number },
    ): ConvexHullResult {
        const simplified = HullCompute.simplifyGeometries(geometries, simplifyFactor);
        const vertices = HullCompute.convexHull(simplified, userShapeScale);
        return { vertices };
    },

    computeConcaveHull(
        geometries: SerializableGeometry[],
        userShapeScale: { x: number; y: number; z: number },
    ): ConcaveHullResult {
        const simplified = HullCompute.simplifyGeometries(geometries, 0);
        return HullCompute.concaveHull(simplified, userShapeScale);
    },
};

expose(api);

export type GeometryWorkerAPI = typeof api;

// Default export for bun test compatibility (?worker imports resolve as regular modules in tests)
export default api;
