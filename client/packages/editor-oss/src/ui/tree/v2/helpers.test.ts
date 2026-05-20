import {Object3D} from "three";
import {describe, expect, it} from "vitest";

import {isProtectedTreeNode} from "./helpers";
import type Editor from "../../../editor/Editor";

const stemAssetId = "stem-asset-1";

const makeEditor = ({stemEditor}: {stemEditor: boolean}) => {
    const scene = new Object3D();
    const camera = new Object3D();
    const stemInstance = new Object3D();
    stemInstance.userData.prefabId = stemAssetId;
    scene.add(stemInstance);

    if (stemEditor) {
        scene.userData.stemEditor = {assetId: stemAssetId};
    }

    return {
        editor: {scene, camera} as unknown as Editor,
        scene,
        camera,
        stemInstance,
    };
};

describe("isProtectedTreeNode", () => {
    it("protects the scene root", () => {
        const {editor, scene} = makeEditor({stemEditor: false});
        expect(isProtectedTreeNode(scene.uuid, editor)).toBe(true);
    });

    it("protects the default camera", () => {
        const {editor, camera} = makeEditor({stemEditor: false});
        expect(isProtectedTreeNode(camera.uuid, editor)).toBe(true);
    });

    it("does not protect ordinary objects", () => {
        const {editor} = makeEditor({stemEditor: false});
        expect(isProtectedTreeNode("some-other-uuid", editor)).toBe(false);
    });

    it("protects the stem instance when in stem-editor mode", () => {
        const {editor, stemInstance} = makeEditor({stemEditor: true});
        expect(isProtectedTreeNode(stemInstance.uuid, editor)).toBe(true);
    });

    it("does not protect the stem instance outside stem-editor mode", () => {
        const {editor, stemInstance} = makeEditor({stemEditor: false});
        expect(isProtectedTreeNode(stemInstance.uuid, editor)).toBe(false);
    });

    it("returns false for null uuid", () => {
        const {editor} = makeEditor({stemEditor: true});
        expect(isProtectedTreeNode(null, editor)).toBe(false);
    });
});
