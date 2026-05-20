import * as THREE from "three";
import {describe, expect, it, vi} from "vitest";

import {patchPassNode} from "./patchPassNode";

describe("patchPassNode", () => {
    it("sets opaque/transparent flags and filters rendered objects via the renderer hook", () => {
        const scene = new THREE.Scene();
        const line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial());
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
        scene.add(line, mesh);

        // Track which objects the patched render function would actually emit.
        const renderObjectCalls: THREE.Object3D[] = [];
        let installedFilter: ((object: THREE.Object3D, ...rest: unknown[]) => void) | null = null;
        const fakeRenderer = {
            getRenderObjectFunction: vi.fn().mockReturnValue(null),
            setRenderObjectFunction: vi.fn().mockImplementation((fn: ((object: THREE.Object3D, ...rest: unknown[]) => void) | null) => {
                if (fn) installedFilter = fn;
            }),
            renderObject: vi.fn().mockImplementation((object: THREE.Object3D) => {
                renderObjectCalls.push(object);
            }),
        };

        const passNode = {
            opaque: false,
            transparent: false,
            scene,
            renderer: fakeRenderer,
            updateBefore() {
                // While the patched filter is installed, exercise it with both objects.
                installedFilter!(line);
                installedFilter!(mesh);
            },
        };

        patchPassNode(passNode as unknown as Parameters<typeof patchPassNode>[0], false, true, false, false, false, {
            shouldHideObject: object => (object as THREE.Line).isLine === true,
        });

        (passNode as any).updateBefore({renderer: fakeRenderer});

        expect(passNode.opaque).toBe(true);
        expect(passNode.transparent).toBe(false);
        // Line should have been filtered out, mesh should have been forwarded.
        expect(renderObjectCalls).toEqual([mesh]);
    });
});
