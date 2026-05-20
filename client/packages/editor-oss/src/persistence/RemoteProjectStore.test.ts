import {describe, expect, it, vi} from "vitest";

import {RemoteProjectStore} from "./RemoteProjectStore";
import type {
    RemoteProjectStoreDeps,
    RemoteSceneListResult,
    RemoteSceneLoadResult,
} from "./RemoteProjectStore";
import type {ProjectBody, ProjectMeta} from "./types";

const makeDeps = (overrides: Partial<RemoteProjectStoreDeps> = {}): RemoteProjectStoreDeps => ({
    fetchScenes: vi.fn(async (): Promise<RemoteSceneListResult> => ({
        Scenes: [],
        Page: 1,
        HasMore: false,
        TotalCount: 0,
    })),
    loadScene: vi.fn(async (): Promise<RemoteSceneLoadResult> => ({data: {}, metadata: {}})),
    saveScene: vi.fn(async (): Promise<ProjectMeta> => ({
        id: "x",
        name: "x",
        createdAt: "now",
        updatedAt: "now",
    })),
    deleteScene: vi.fn(async () => undefined),
    ...overrides,
});

describe("RemoteProjectStore", () => {
    it("kind is 'remote'", () => {
        const store = new RemoteProjectStore(makeDeps());
        expect(store.kind).toBe("remote");
    });

    it("list passes pagination + search through to deps and maps wire shape", async () => {
        const fetchScenes = vi.fn(async () => ({
            Scenes: [
                {ID: "1", Name: "First", UpdateTime: "2024-01-01", CreateTime: "2024-01-01"},
                {ID: "2", Name: "Second", UpdateTime: "2024-01-02", Thumbnail: "x.png"},
            ],
            Page: 2,
            HasMore: true,
            TotalCount: 10,
        }));
        const store = new RemoteProjectStore(makeDeps({fetchScenes}));

        const result = await store.list({page: 2, limit: 5, search: "demo"});

        expect(fetchScenes).toHaveBeenCalledWith({page: 2, limit: 5, search: "demo"});
        expect(result.projects).toHaveLength(2);
        expect(result.projects[0]).toMatchObject({id: "1", name: "First"});
        expect(result.projects[1]).toMatchObject({id: "2", name: "Second", thumbnailUrl: "x.png"});
        expect(result.page).toBe(2);
        expect(result.hasMore).toBe(true);
        expect(result.totalCount).toBe(10);
    });

    it("load returns a ProjectBody with meta + serialized sceneJson", async () => {
        const loadScene = vi.fn(async () => ({
            data: {scene: "stuff", objects: [1, 2, 3]},
            metadata: {Name: "Demo", UpdateTime: "2024-05-10", CreateTime: "2024-05-01", Thumbnail: "t.png"},
        }));
        const store = new RemoteProjectStore(makeDeps({loadScene}));

        const body = await store.load("abc");

        expect(loadScene).toHaveBeenCalledWith("abc");
        expect(body.meta).toMatchObject({
            id: "abc",
            name: "Demo",
            updatedAt: "2024-05-10",
            createdAt: "2024-05-01",
            thumbnailUrl: "t.png",
        });
        expect(JSON.parse(body.sceneJson)).toMatchObject({scene: "stuff"});
    });

    it("load tolerates missing metadata (falls back to defaults)", async () => {
        const loadScene = vi.fn(async () => ({data: "raw-string-data", metadata: undefined}));
        const store = new RemoteProjectStore(makeDeps({loadScene}));

        const body = await store.load("id-x");

        expect(body.meta.id).toBe("id-x");
        expect(body.meta.name).toBe("Untitled");
        expect(body.meta.updatedAt).toBeTruthy();
        expect(body.sceneJson).toBe("raw-string-data");
    });

    it("save delegates to deps.saveScene and returns its meta", async () => {
        const returned = {id: "saved-1", name: "Saved", createdAt: "now", updatedAt: "now"} as ProjectMeta;
        const saveScene = vi.fn(async () => returned);
        const store = new RemoteProjectStore(makeDeps({saveScene}));

        const body: ProjectBody = {
            meta: {id: "", name: "input", createdAt: "", updatedAt: ""},
            sceneJson: JSON.stringify({hello: "world"}),
        };

        const result = await store.save(body);
        expect(saveScene).toHaveBeenCalledTimes(1);
        expect(saveScene).toHaveBeenCalledWith(body);
        expect(result).toBe(returned);
    });

    it("delete passes through", async () => {
        const deleteScene = vi.fn(async () => undefined);
        const store = new RemoteProjectStore(makeDeps({deleteScene}));
        await store.delete("xyz");
        expect(deleteScene).toHaveBeenCalledWith("xyz");
    });

    it("exportToBlob produces JSON body containing the loaded scene", async () => {
        const loadScene = vi.fn(async () => ({data: {a: 1}, metadata: {Name: "X"}}));
        const store = new RemoteProjectStore(makeDeps({loadScene}));

        const blob = await store.exportToBlob("xx");
        expect(blob.type).toBe("application/json");
        const parsed = JSON.parse(await blob.text()) as ProjectBody;
        expect(parsed.meta.name).toBe("X");
        expect(JSON.parse(parsed.sceneJson)).toMatchObject({a: 1});
    });

    it("importFromBlob roundtrips through save", async () => {
        const returned = {id: "imported", name: "X", createdAt: "now", updatedAt: "now"} as ProjectMeta;
        const saveScene = vi.fn(async () => returned);
        const store = new RemoteProjectStore(makeDeps({saveScene}));

        const body: ProjectBody = {
            meta: {id: "", name: "X", createdAt: "", updatedAt: ""},
            sceneJson: "{}",
        };
        const blob = new Blob([JSON.stringify(body)], {type: "application/json"});

        const meta = await store.importFromBlob(blob);
        expect(meta).toBe(returned);
        expect(saveScene).toHaveBeenCalled();
    });

    it("importFromBlob rejects malformed input", async () => {
        const store = new RemoteProjectStore(makeDeps());
        const garbage = new Blob([JSON.stringify({not: "a body"})], {type: "application/json"});
        await expect(store.importFromBlob(garbage)).rejects.toThrow("not a valid .stemscript");
    });
});
