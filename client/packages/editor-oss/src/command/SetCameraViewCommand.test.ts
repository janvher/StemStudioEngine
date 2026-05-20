import * as THREE from "three";
import {describe, it, expect, beforeEach, vi} from "vitest";

// vi.mock is hoisted above imports, so we build the mock lazily and hand
// direct references out afterwards. The mock factory can't close over
// module-scope variables defined after the vi.mock call.
vi.mock("../global", () => {
    const camera = new THREE.PerspectiveCamera();
    const center = new THREE.Vector3();
    const app = {
        call: vi.fn(),
        on: vi.fn(),
        editor: {
            camera,
            controls: {controls: {center}},
            execute: vi.fn(),
        },
    };
    return {default: {app}};
});

vi.mock("i18next", () => ({
    t: (s: string) => s,
}));

import global from "../global";
import {SetCameraViewCommand} from "./SetCameraViewCommand";

const mockApp = (global as any).app;
const mockCamera: THREE.PerspectiveCamera = mockApp.editor.camera;
const mockControlsCenter: THREE.Vector3 = mockApp.editor.controls.controls.center;

describe("SetCameraViewCommand", () => {
    beforeEach(() => {
        mockCamera.position.set(0, 0, 0);
        mockCamera.up.set(0, 1, 0);
        mockControlsCenter.set(0, 0, 0);
        (mockApp.call as ReturnType<typeof vi.fn>).mockClear();
    });

    it("moves the camera to the target view position", () => {
        const cmd = new SetCameraViewCommand({
            id: "v1",
            name: "Top",
            kind: "top",
            position: [10, 20, 30],
            target: [0, 0, 0],
            up: [0, 0, 1],
        });
        const result = cmd.execute();
        expect(result.status).toBe("success");
        expect(mockCamera.position.x).toBeCloseTo(10);
        expect(mockCamera.position.y).toBeCloseTo(20);
        expect(mockCamera.position.z).toBeCloseTo(30);
        expect(mockCamera.up.z).toBeCloseTo(1);
    });

    it("updates the controls' look-at center so orbit rotates around new target", () => {
        const cmd = new SetCameraViewCommand({
            id: "v2",
            name: "Focus",
            kind: "custom",
            position: [5, 5, 5],
            target: [7, 8, 9],
            up: [0, 1, 0],
        });
        cmd.execute();
        expect(mockControlsCenter.x).toBeCloseTo(7);
        expect(mockControlsCenter.y).toBeCloseTo(8);
        expect(mockControlsCenter.z).toBeCloseTo(9);
    });

    it("undo restores the previous camera pose", () => {
        mockCamera.position.set(1, 2, 3);
        mockControlsCenter.set(4, 5, 6);
        const cmd = new SetCameraViewCommand({
            id: "v3",
            name: "Other",
            kind: "front",
            position: [100, 100, 100],
            target: [0, 0, 0],
            up: [0, 1, 0],
        });
        cmd.execute();
        expect(mockCamera.position.x).toBeCloseTo(100);
        cmd.undo();
        expect(mockCamera.position.x).toBeCloseTo(1);
        expect(mockCamera.position.y).toBeCloseTo(2);
        expect(mockCamera.position.z).toBeCloseTo(3);
        // Controls center is restored too.
        expect(mockControlsCenter.x).toBeCloseTo(4);
        expect(mockControlsCenter.y).toBeCloseTo(5);
        expect(mockControlsCenter.z).toBeCloseTo(6);
    });

    it("does NOT fire objectChanged (camera is per-user, not collaboration-synced)", () => {
        const cmd = new SetCameraViewCommand({
            id: "v4",
            name: "Top",
            kind: "top",
            position: [0, 10, 0],
            target: [0, 0, 0],
            up: [0, 0, 1],
        });
        cmd.execute();
        const callSpy = mockApp.call as ReturnType<typeof vi.fn>;
        const objectChangedCalls = callSpy.mock.calls.filter(c => c[0] === "objectChanged");
        expect(objectChangedCalls.length).toBe(0);
    });
});
