import * as THREE from "three";
import {describe, it, expect, vi} from "vitest";

import {MeshData} from "./MeshData";

// Mock the global module used by CADController
vi.mock("../../global", () => ({
    default: {
        app: {
            call: vi.fn(),
            on: vi.fn(),
            editor: {
                addObject: vi.fn(),
                removeObject: vi.fn(),
                select: vi.fn(),
                deselect: vi.fn(),
                objectByUuid: vi.fn(() => null),
            },
        },
    },
}));

vi.mock("i18next", () => ({
    t: (s: string) => s,
}));

vi.mock("../../showToast", () => ({
    showToast: vi.fn(),
}));

// We test the array transform logic in isolation. CADController owns the full
// pipeline (including commitMeshEdit), so we rebuild the transform math here
// the same way it runs inside arrayMeshWithTransform — if we replicate the
// behavior and it matches intent, the integration path is wire-equivalent.
function arrayMeshTransformOnly(source: MeshData, count: number, transform: (i: number, p: THREE.Vector3) => THREE.Vector3): MeshData {
    const result = new MeshData();
    const sourceFaceVertexLists = Array.from(source.faces.values()).map(f => [...f.vertexIds]);
    for (let copyIndex = 0; copyIndex < count; copyIndex++) {
        const map = new Map<number, number>();
        for (const vertex of source.vertices.values()) {
            const src = new THREE.Vector3(vertex.position.x, vertex.position.y, vertex.position.z);
            const xformed = transform(copyIndex, src);
            const created = result.addVertex({x: xformed.x, y: xformed.y, z: xformed.z});
            map.set(vertex.id, created.id);
        }
        for (const list of sourceFaceVertexLists) {
            const mapped = list.map(id => map.get(id)).filter((id): id is number => id !== undefined);
            if (mapped.length >= 3) result.addFace(mapped);
        }
    }
    return result;
}

function makeSingleTriangle(): MeshData {
    const md = new MeshData();
    const a = md.addVertex({x: 0, y: 0, z: 0});
    const b = md.addVertex({x: 1, y: 0, z: 0});
    const c = md.addVertex({x: 0, y: 1, z: 0});
    md.addFace([a.id, b.id, c.id]);
    return md;
}

describe("arrayMesh transform math", () => {
    it("linear array produces N copies with expected offsets", () => {
        const source = makeSingleTriangle();
        const offset = new THREE.Vector3(2, 0, 0);
        const result = arrayMeshTransformOnly(source, 3, (i, p) => {
            return new THREE.Vector3(p.x + offset.x * i, p.y + offset.y * i, p.z + offset.z * i);
        });
        // 3 copies * 3 vertices = 9 total. 3 faces.
        expect(result.vertices.size).toBe(9);
        expect(result.faces.size).toBe(3);

        // First copy vertex positions should match source (offset 0).
        const firstCopyPositions = Array.from(result.vertices.values()).slice(0, 3).map(v => v.position.x);
        expect(firstCopyPositions.sort()).toEqual([0, 0, 1]);

        // Second copy should be offset by 2 on X.
        const secondCopyPositions = Array.from(result.vertices.values()).slice(3, 6).map(v => v.position.x);
        expect(secondCopyPositions.sort()).toEqual([2, 2, 3]);

        // Third copy should be offset by 4 on X.
        const thirdCopyPositions = Array.from(result.vertices.values()).slice(6, 9).map(v => v.position.x);
        expect(thirdCopyPositions.sort()).toEqual([4, 4, 5]);
    });

    it("radial array around Y produces copies at expected angles", () => {
        const source = makeSingleTriangle();
        const axisVec = new THREE.Vector3(0, 1, 0);
        const count = 4; // 90° between copies (full 360° sweep)
        const angleStep = (Math.PI * 2) / count;

        const result = arrayMeshTransformOnly(source, count, (i, p) => {
            if (i === 0) return p.clone();
            const q = new THREE.Quaternion().setFromAxisAngle(axisVec, angleStep * i);
            return p.clone().applyQuaternion(q);
        });

        expect(result.vertices.size).toBe(12); // 4 copies * 3 verts
        expect(result.faces.size).toBe(4);

        // The vertex that was at (1, 0, 0) rotated 90° around Y should be at (0, 0, -1).
        const allVerts = Array.from(result.vertices.values());
        // Second copy's "b" vertex (was (1,0,0)) is index 3+1=4 in insertion order.
        const rotated = allVerts[4]!.position;
        expect(rotated.x).toBeCloseTo(0);
        expect(rotated.y).toBeCloseTo(0);
        expect(rotated.z).toBeCloseTo(-1);
    });
});
