/**
 * Tests for the OSS scene-save wiring. Verifies two things:
 *
 *   1. `setProjectStore` automatically installs / clears the OSS save
 *      handler on `network/scene` depending on the store kind. This is
 *      what makes every existing `saveScene(...)` call site route to
 *      IndexedDB / FS Access in OSS builds without changes to call sites.
 *
 *   2. The `ossSaveScene` handler itself serializes the editor state via
 *      Converter, builds a ProjectBody, and persists it through the
 *      registered store. Failures are reported via app events + a toast.
 */

import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {ossSaveScene} from "./ossSceneSave";
import {setProjectStore} from "./projectStoreFactory";
import type {ProjectStore} from "./ProjectStore";
import type {ProjectBody, ProjectMeta} from "./types";

type PreviewState = {previewId: string; label?: string};

const networkScene = await vi.hoisted(async () => {
    const handlerSpy = vi.fn();
    return {
        handlerSpy,
        module: {
            setSceneSaveHandler: handlerSpy,
        },
    };
});

const copilotPreview = vi.hoisted(() => ({
    getActive: vi.fn<() => PreviewState | null>(() => null),
    isBlocked: vi.fn<() => boolean>(() => false),
}));

const stemEditorSave = vi.hoisted(() => ({
    save: vi.fn(async () => undefined),
}));

vi.mock("@stem/network/api/scene", async () => networkScene.module);

vi.mock("../agent/copilotPreviewPersistence", () => ({
    getActiveCopilotPreviewPersistence: copilotPreview.getActive,
    isCopilotPreviewSceneSaveBlocked: copilotPreview.isBlocked,
}));

vi.mock("../editor/stem-editor/saveStemEditor", () => ({
    saveStemEditor: stemEditorSave.save,
}));

vi.mock("../showToast", () => ({
    showToast: vi.fn(),
}));

vi.mock("../serialization/Converter", () => {
    return {
        default: class {
            toJSON(opts: unknown) {
                return {wrapped: opts};
            }
        },
    };
});

const stubStore = (kind: "indexeddb" | "filesystem" | "remote", save?: ProjectStore["save"]): ProjectStore => ({
    kind,
    list: vi.fn(async () => ({projects: [], page: 1, hasMore: false, totalCount: 0})),
    load: vi.fn(async () => ({meta: {id: "", name: "", updatedAt: "", createdAt: ""}, sceneJson: "{}"})),
    save: save ?? vi.fn(async (body: ProjectBody): Promise<ProjectMeta> => body.meta),
    delete: vi.fn(async () => undefined),
    exportToBlob: vi.fn(async () => new Blob([])),
    importFromBlob: vi.fn(async (): Promise<ProjectMeta> => ({id: "", name: "", updatedAt: "", createdAt: ""})),
    saveAssets: vi.fn(async () => undefined),
    loadAssets: vi.fn(async () => []),
});

beforeEach(() => {
    networkScene.handlerSpy.mockClear();
    // Reset singleton + clear handler between tests.
    setProjectStore(undefined);
    networkScene.handlerSpy.mockClear();
});

afterEach(() => {
    setProjectStore(undefined);
});

describe("setProjectStore handler wiring", () => {
    it("installs the OSS save handler when an IndexedDB store is registered", () => {
        setProjectStore(stubStore("indexeddb"));
        const last = networkScene.handlerSpy.mock.calls.at(-1);
        expect(last?.[0]).toBe(ossSaveScene);
    });

    it("installs the OSS save handler when a FileSystem store is registered", () => {
        setProjectStore(stubStore("filesystem"));
        const last = networkScene.handlerSpy.mock.calls.at(-1);
        expect(last?.[0]).toBe(ossSaveScene);
    });

    it("clears the save handler when a Remote store is registered", () => {
        setProjectStore(stubStore("remote"));
        const last = networkScene.handlerSpy.mock.calls.at(-1);
        expect(last?.[0]).toBeNull();
    });

    it("clears the save handler when the store is unset", () => {
        setProjectStore(undefined);
        const last = networkScene.handlerSpy.mock.calls.at(-1);
        expect(last?.[0]).toBeNull();
    });
});

describe("ossSaveScene", () => {
    type AppLike = {
        options: unknown;
        camera: unknown;
        scripts: unknown;
        scene: {name: string; userData?: Record<string, unknown>};
        editor: {
            isReadOnly?: boolean;
            sceneID?: string;
            sceneName?: string;
            sceneThumbnail?: string;
            onSaveScene: () => void;
        };
        call: ReturnType<typeof vi.fn>;
    };

    const buildApp = (overrides: Partial<AppLike["editor"]> = {}): AppLike => ({
        options: {fov: 60},
        camera: {position: [0, 0, 5]},
        scripts: {},
        scene: {name: "main", userData: {}},
        editor: {
            isReadOnly: false,
            sceneName: "My Project",
            onSaveScene: vi.fn(),
            ...overrides,
        },
        call: vi.fn(),
    });

    beforeEach(async () => {
        const globalMod = await import("../global");
        // @ts-expect-error mutate for test
        globalMod.default.app = undefined;
        copilotPreview.getActive.mockReturnValue(null);
        copilotPreview.isBlocked.mockReturnValue(false);
        stemEditorSave.save.mockClear();
    });

    it("persists a serialized body via the registered ProjectStore and back-fills sceneID", async () => {
        const saveSpy = vi.fn(async (body: ProjectBody): Promise<ProjectMeta> => body.meta);
        setProjectStore(stubStore("indexeddb", saveSpy));

        const app = buildApp(); // no sceneID — handler must generate one
        const globalMod = await import("../global");
        // @ts-expect-error mutate for test
        globalMod.default.app = app;

        await ossSaveScene(false, false);

        expect(saveSpy).toHaveBeenCalledTimes(1);
        const body = saveSpy.mock.calls[0]![0]!;
        expect(body.meta.name).toBe("My Project");
        expect(body.meta.id).toMatch(/^oss-/);
        expect(body.sceneJson).toContain('"wrapped"');
        expect(app.call).toHaveBeenCalledWith("sceneSaveStart");
        expect(app.call).toHaveBeenCalledWith(
            "sceneSaved",
            null,
            expect.objectContaining({id: body.meta.id}),
        );
        expect(app.editor.sceneID).toBe(body.meta.id);
    });

    it("preserves an existing sceneID across saves", async () => {
        const saveSpy = vi.fn(async (body: ProjectBody): Promise<ProjectMeta> => body.meta);
        setProjectStore(stubStore("indexeddb", saveSpy));

        const app = buildApp({sceneID: "existing-id"});
        const globalMod = await import("../global");
        // @ts-expect-error mutate for test
        globalMod.default.app = app;

        await ossSaveScene(false, false);
        const body = saveSpy.mock.calls[0]![0]!;
        expect(body.meta.id).toBe("existing-id");
        expect(app.editor.sceneID).toBe("existing-id");
    });

    it("emits sceneSaveFailed and does not write when serialization throws", async () => {
        const saveSpy = vi.fn();
        setProjectStore(stubStore("indexeddb", saveSpy));

        const app = buildApp();
        // Replace Converter mock for this test to throw.
        const converterMod = (await import("../serialization/Converter")) as {default: unknown};
        const original = converterMod.default;
        converterMod.default = class {
            toJSON() {
                throw new Error("serialize boom");
            }
        };

        const globalMod = await import("../global");
        // @ts-expect-error mutate for test
        globalMod.default.app = app;

        await ossSaveScene(false, false);

        expect(saveSpy).not.toHaveBeenCalled();
        expect(app.call).toHaveBeenCalledWith("sceneSaveFailed");

        converterMod.default = original;
    });

    it("short-circuits in read-only mode", async () => {
        const saveSpy = vi.fn();
        setProjectStore(stubStore("indexeddb", saveSpy));

        const app = buildApp({isReadOnly: true});
        const globalMod = await import("../global");
        // @ts-expect-error mutate for test
        globalMod.default.app = app;

        await ossSaveScene(false, false);
        expect(saveSpy).not.toHaveBeenCalled();
        expect(app.call).not.toHaveBeenCalledWith("sceneSaveStart");
    });

    it("blocks local saves while a Copilot preview is active", async () => {
        const saveSpy = vi.fn();
        setProjectStore(stubStore("indexeddb", saveSpy));
        copilotPreview.isBlocked.mockReturnValue(true);
        copilotPreview.getActive.mockReturnValue({previewId: "preview-1", label: "Preview"});

        const app = buildApp();
        const globalMod = await import("../global");
        // @ts-expect-error mutate for test
        globalMod.default.app = app;

        await ossSaveScene(false, false);

        expect(saveSpy).not.toHaveBeenCalled();
        expect(app.call).toHaveBeenCalledWith(
            "copilotPreviewSaveBlocked",
            null,
            expect.objectContaining({previewId: "preview-1"}),
        );
    });

    it("delegates to the stem editor save flow for stem-editor scenes", async () => {
        const saveSpy = vi.fn();
        setProjectStore(stubStore("indexeddb", saveSpy));

        const app = buildApp();
        app.scene.userData = {stemEditor: {assetId: "stem-asset"}};
        const globalMod = await import("../global");
        // @ts-expect-error mutate for test
        globalMod.default.app = app;

        await ossSaveScene(false, false);

        expect(stemEditorSave.save).toHaveBeenCalledTimes(1);
        expect(saveSpy).not.toHaveBeenCalled();
        expect(app.call).not.toHaveBeenCalledWith("sceneSaveStart");
    });
});
