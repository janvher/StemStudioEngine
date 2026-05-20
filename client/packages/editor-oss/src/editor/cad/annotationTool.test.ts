import * as THREE from "three";
import {describe, it, expect, beforeEach, vi} from "vitest";

vi.mock("../../global", () => {
    const viewport = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    };
    const sceneHelpers = new THREE.Group();
    const app: any = {
        call: vi.fn(),
        on: vi.fn(),
        viewport,
        sceneHelpers,
        editor: null as any,
    };
    app.editor = {
        scene: new THREE.Scene(),
        computeIntersectPoint: vi.fn(({x}: {x: number; y: number}) => new THREE.Vector3(x, 0, 0)),
        addObject: vi.fn((obj: any) => app.editor.scene.add(obj)),
        removeObject: vi.fn((obj: any) => app.editor.scene.remove(obj)),
        select: vi.fn(),
        deselect: vi.fn(),
        objectByUuid: vi.fn((uuid: string) => app.editor.scene.getObjectByProperty("uuid", uuid) ?? null),
        execute: vi.fn(async (cmd: any) => cmd.execute()),
    };
    return {default: {app}};
});

vi.mock("i18next", () => ({
    default: {
        t: (s: string) => s,
        use: () => ({init: vi.fn()}),
        on: vi.fn(),
        languages: [],
        language: "en",
    },
    t: (s: string) => s,
}));

// Some command barrel imports pull in `../../i18n/config` which runs i18next
// initialization at import time. Short-circuit it so the test suite doesn't
// need the full i18n stack.
vi.mock("../../i18n/config", () => ({
    default: {
        t: (s: string) => s,
    },
}));

import global from "@stem/editor-oss/global";
import {AnnotationTool} from "./annotationTool";

function fakePointerDown(x: number, y: number): PointerEvent {
    return {button: 0, clientX: x, clientY: y} as unknown as PointerEvent;
}

describe("AnnotationTool", () => {
    let tool: AnnotationTool;
    let app: any;

    beforeEach(() => {
        app = (global as any).app;
        app.scene = new THREE.Scene();
        app.editor.scene = app.scene;
        app.sceneHelpers = new THREE.Group();
        (app.editor.execute as ReturnType<typeof vi.fn>).mockClear();
        tool = new AnnotationTool(app.editor);
    });

    it("starts inactive and becomes active after start()", () => {
        expect(tool.isActive()).toBe(false);
        expect(tool.start("distance")).toBe(true);
        expect(tool.isActive()).toBe(true);
        expect(tool.getActiveType()).toBe("distance");
    });

    it("refuses to start a second session while active", () => {
        tool.start("distance");
        expect(tool.start("angle")).toBe(false);
        expect(tool.getActiveType()).toBe("distance");
    });

    it("distance auto-commits on the second click", async () => {
        tool.start("distance");
        (tool as any).handlePointerDown(fakePointerDown(1, 0));
        expect(tool.isActive()).toBe(true);
        (tool as any).handlePointerDown(fakePointerDown(5, 0));
        // commit is async-fire-and-forget inside the handler, so wait a tick
        await Promise.resolve();
        await Promise.resolve();
        expect(app.editor.execute).toHaveBeenCalledTimes(1);
    });

    it("angle auto-commits on the third click", async () => {
        tool.start("angle");
        (tool as any).handlePointerDown(fakePointerDown(1, 0));
        (tool as any).handlePointerDown(fakePointerDown(0, 0));
        expect(app.editor.execute).not.toHaveBeenCalled();
        (tool as any).handlePointerDown(fakePointerDown(2, 0));
        await Promise.resolve();
        await Promise.resolve();
        expect(app.editor.execute).toHaveBeenCalledTimes(1);
    });

    it("polyline only commits on dblclick (not on click count)", async () => {
        tool.start("polyline");
        (tool as any).handlePointerDown(fakePointerDown(1, 0));
        (tool as any).handlePointerDown(fakePointerDown(2, 0));
        (tool as any).handlePointerDown(fakePointerDown(3, 0));
        (tool as any).handlePointerDown(fakePointerDown(4, 0));
        expect(app.editor.execute).not.toHaveBeenCalled();
        (tool as any).handleDoubleClick({preventDefault: vi.fn()});
        await Promise.resolve();
        await Promise.resolve();
        expect(app.editor.execute).toHaveBeenCalledTimes(1);
    });

    it("pointNote commits on the first click", async () => {
        tool.start("pointNote", {text: "label"});
        (tool as any).handlePointerDown(fakePointerDown(5, 0));
        await Promise.resolve();
        await Promise.resolve();
        expect(app.editor.execute).toHaveBeenCalledTimes(1);
    });

    it("cancel() clears the session and does not commit", () => {
        tool.start("distance");
        (tool as any).handlePointerDown(fakePointerDown(1, 0));
        tool.cancel();
        expect(tool.isActive()).toBe(false);
        expect(app.editor.execute).not.toHaveBeenCalled();
    });

    it("Escape key cancels the active session", () => {
        tool.start("distance");
        (tool as any).handlePointerDown(fakePointerDown(1, 0));
        (tool as any).handleKeyDown({key: "Escape", preventDefault: vi.fn()});
        expect(tool.isActive()).toBe(false);
        expect(app.editor.execute).not.toHaveBeenCalled();
    });

    it("maintains a preview annotation in sceneHelpers while picking", () => {
        tool.start("polyline");
        (tool as any).handlePointerDown(fakePointerDown(1, 0));
        (tool as any).handlePointerDown(fakePointerDown(2, 0));
        const previews = app.sceneHelpers.children.filter((c: any) => c.userData?.annotationPreview);
        expect(previews.length).toBe(1);
        tool.cancel();
        const previewsAfter = app.sceneHelpers.children.filter((c: any) => c.userData?.annotationPreview);
        expect(previewsAfter.length).toBe(0);
    });
});
