import {describe, expect, it} from "vitest";
import * as THREE from "three";

import Editor from "./Editor";

describe("Editor drill-down selection", () => {
    it("keeps current selection when child nodes are hidden from the scene hierarchy", () => {
        const editor = Object.create(Editor.prototype) as Editor;

        const root = new THREE.Object3D();
        root.name = "ImportedModel";
        root.userData = {isStemObject: true};

        const armature = new THREE.Object3D();
        armature.name = "Armature";
        armature.userData = {isRuntimeOnly: true};

        const mesh = new THREE.Object3D();
        mesh.name = "Body";
        mesh.userData = {isRuntimeOnly: true};
        (mesh as THREE.Object3D & {geometry?: object}).geometry = {};

        root.add(armature);
        armature.add(mesh);

        expect(editor.drillDownSelection(root, root)).toBe(root);
    });

    it("still drills down to child objects that are visible in the scene hierarchy", () => {
        const editor = Object.create(Editor.prototype) as Editor;

        const root = new THREE.Object3D();
        root.name = "ImportedModel";
        root.userData = {isStemObject: true};

        const childGroup = new THREE.Object3D();
        childGroup.name = "VisibleChild";
        childGroup.userData = {isStemObject: true};

        root.add(childGroup);

        expect(editor.drillDownSelection(root, root)).toBe(childGroup);
    });
});