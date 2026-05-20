import * as THREE from "three";
import {describe, it, expect, beforeEach, vi} from "vitest";

import {AlignDistributeCommand} from "./AlignDistributeCommand";
import global from "../../global";

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

function makeBox(x: number, y: number, z: number): THREE.Mesh {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
    mesh.position.set(x, y, z);
    return mesh;
}

describe("AlignDistributeCommand", () => {
    let parent: THREE.Group;

    beforeEach(() => {
        parent = new THREE.Group();
    });

    it("throws when given fewer than 2 objects", () => {
        expect(() => new AlignDistributeCommand([makeBox(0, 0, 0)], "x", "align")).toThrow();
    });

    it("throws when distribute is given fewer than 3 objects", () => {
        const a = makeBox(0, 0, 0);
        const b = makeBox(5, 0, 0);
        parent.add(a, b);
        expect(() => new AlignDistributeCommand([a, b], "x", "distribute")).toThrow();
    });

    it("align X centers all boxes to the selection center on X", async () => {
        const a = makeBox(0, 1, 2);
        const b = makeBox(10, 3, 4);
        parent.add(a, b);
        const cmd = new AlignDistributeCommand([a, b], "x", "align");
        await cmd.execute();
        // Selection center on X = 5. Both boxes (unit cubes centered at their
        // positions) should now be centered on X=5, leaving Y/Z untouched.
        expect(a.position.x).toBeCloseTo(5);
        expect(b.position.x).toBeCloseTo(5);
        expect(a.position.y).toBeCloseTo(1);
        expect(a.position.z).toBeCloseTo(2);
        expect(b.position.y).toBeCloseTo(3);
        expect(b.position.z).toBeCloseTo(4);
    });

    it("distribute X evenly spaces interior objects between endpoints", async () => {
        const a = makeBox(0, 0, 0);
        const b = makeBox(3, 0, 0);
        const c = makeBox(10, 0, 0);
        parent.add(a, b, c);
        const cmd = new AlignDistributeCommand([a, b, c], "x", "distribute");
        await cmd.execute();
        // Endpoints stay at 0 and 10, interior should land at 5.
        expect(a.position.x).toBeCloseTo(0);
        expect(b.position.x).toBeCloseTo(5);
        expect(c.position.x).toBeCloseTo(10);
    });

    it("distribute respects sort order, not input order", async () => {
        // Pass in mixed order; distribution should still pin the actual min/max
        // positions and space the middle one evenly.
        const high = makeBox(10, 0, 0);
        const low = makeBox(0, 0, 0);
        const mid = makeBox(2, 0, 0);
        parent.add(high, low, mid);
        const cmd = new AlignDistributeCommand([high, low, mid], "x", "distribute");
        await cmd.execute();
        expect(low.position.x).toBeCloseTo(0);
        expect(high.position.x).toBeCloseTo(10);
        expect(mid.position.x).toBeCloseTo(5);
    });

    it("align Y leaves X and Z untouched", async () => {
        const a = makeBox(1, 0, 2);
        const b = makeBox(5, 10, 6);
        parent.add(a, b);
        const cmd = new AlignDistributeCommand([a, b], "y", "align");
        await cmd.execute();
        expect(a.position.y).toBeCloseTo(5);
        expect(b.position.y).toBeCloseTo(5);
        expect(a.position.x).toBeCloseTo(1);
        expect(b.position.x).toBeCloseTo(5);
    });

    it("undo restores original positions", async () => {
        const a = makeBox(0, 0, 0);
        const b = makeBox(10, 0, 0);
        parent.add(a, b);
        const cmd = new AlignDistributeCommand([a, b], "x", "align");
        await cmd.execute();
        expect(a.position.x).toBeCloseTo(5);
        cmd.undo();
        expect(a.position.x).toBeCloseTo(0);
        expect(b.position.x).toBeCloseTo(10);
    });

    it("fires objectChanged per moved object so collaboration sync picks it up", async () => {
        // Collaboration mode is state-based: CollaborationClient listens for the
        // "objectChanged" event and serializes the target object to the remote
        // peer. Any command that repositions objects MUST fire objectChanged or
        // the move will not propagate to other users.
        const a = makeBox(0, 0, 0);
        const b = makeBox(10, 0, 0);
        parent.add(a, b);
        const callSpy = (global as any).app.call as ReturnType<typeof vi.fn>;
        callSpy.mockClear();
        const cmd = new AlignDistributeCommand([a, b], "x", "align");
        await cmd.execute();
        const objectChangedCalls = callSpy.mock.calls.filter(c => c[0] === "objectChanged");
        // Both boxes move, so objectChanged should fire at least once per moved
        // object. (SetPositionCommand fires it unconditionally on execute.)
        expect(objectChangedCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("align is a no-op when objects are already aligned on that axis", async () => {
        const a = makeBox(5, 0, 0);
        const b = makeBox(5, 10, 0);
        parent.add(a, b);
        const cmd = new AlignDistributeCommand([a, b], "x", "align");
        const result = await cmd.execute();
        expect(result.status).toBe("success");
        // Positions unchanged — tolerance generous because buildMoves drops
        // sub-1e-6 deltas rather than applying them.
        expect(a.position.x).toBeCloseTo(5);
        expect(b.position.x).toBeCloseTo(5);
    });
});
