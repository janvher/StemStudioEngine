// @vitest-environment jsdom
import {describe, expect, it} from "vitest";

import {autoResolveImports, findByFilepath} from "./ImportBatchDialog";
import type {ImportRequest} from "./ScriptExecutor";

/** Build a File whose webkitRelativePath encodes a subfolder path. */
const fileAt = (relPath: string, bytes = "x"): File => {
    const name = relPath.split("/").pop()!;
    const f = new File([bytes], name, {type: "application/octet-stream"});
    Object.defineProperty(f, "webkitRelativePath", {value: relPath, configurable: true});
    return f;
};

const imageReq = (index: number, filepath: string, name: string): ImportRequest => ({
    index,
    type: "image",
    name,
    filepath,
    extensions: [".png", ".jpg", ".jpeg", ".webp"],
});

describe("autoResolveImports — explicit filepath resolution", () => {
    it("resolves a filepath whose file has a NON-STANDARD extension (regression)", () => {
        // Repro of the pirate-ship hang: a generator emitted duplicate textures
        // as `PIR_Water.png-2 … -5`. Those filenames end in `.png-2`, not a known
        // image extension. The resolver used to filter candidates by extension
        // BEFORE matching the filepath, dropping these files → the import stayed
        // "unresolved" → the blocking batch-import dialog opened → headless runs
        // hung forever. An explicit filepath must resolve regardless of ext.
        const folder = [
            fileAt("textures/PIR_Water.png"),
            fileAt("textures/PIR_Water.png-2"),
            fileAt("textures/PIR_Water.png-3"),
            fileAt("textures/PIR_Water.png-4"),
            fileAt("textures/PIR_Water.png-5"),
        ];
        const imports: ImportRequest[] = [
            imageReq(0, "textures/PIR_Water.png", "PIR_Water.png"),
            imageReq(1, "textures/PIR_Water.png-2", "PIR_Water.png 2"),
            imageReq(2, "textures/PIR_Water.png-3", "PIR_Water.png 3"),
            imageReq(3, "textures/PIR_Water.png-4", "PIR_Water.png 4"),
            imageReq(4, "textures/PIR_Water.png-5", "PIR_Water.png 5"),
        ];

        const {files} = autoResolveImports(imports, folder);

        // EVERY import resolves — nothing is left for the dialog.
        expect(files.size).toBe(5);
        expect(files.get(1)?.name).toBe("PIR_Water.png-2");
        expect(files.get(4)?.name).toBe("PIR_Water.png-5");
    });

    it("findByFilepath matches an odd-extension file by exact basename", () => {
        const folder = [fileAt("textures/PIR_Water.png-2")];
        expect(findByFilepath(folder, "textures/PIR_Water.png-2")?.name).toBe("PIR_Water.png-2");
    });

    it("still resolves normal model filepaths and reuses one file for several imports", () => {
        // Four wheels all reference the one wheel.glb.
        const folder = [fileAt("models/wheel.glb")];
        const wheel = (i: number): ImportRequest => ({
            index: i, type: "model", name: `wheel ${i}`, filepath: "models/wheel.glb", extensions: [".glb", ".gltf", ".fbx"],
        });
        const {files} = autoResolveImports([wheel(0), wheel(1), wheel(2), wheel(3)], folder);
        expect(files.size).toBe(4);
        expect([...files.values()].every(f => f.name === "wheel.glb")).toBe(true);
    });
});
