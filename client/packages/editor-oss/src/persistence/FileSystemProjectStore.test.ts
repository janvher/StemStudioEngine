// @vitest-environment jsdom
import {beforeEach, describe, expect, it} from "vitest";

import {FileSystemProjectStore} from "./FileSystemProjectStore";
import type {ProjectBody} from "./types";

const sampleBody = (name = "Demo", id = ""): ProjectBody => ({
    meta: {
        id,
        name,
        createdAt: "",
        updatedAt: "",
    },
    sceneJson: JSON.stringify({name}),
});

// The real File System Access API throws a DOMException named "NotFoundError"
// for a missing entry — and FileSystemProjectStore now relies on that name to
// tell a *legitimate absence* (return []) apart from a *read failure* (throw).
// The mock must reproduce that contract, not a generic Error.
const notFound = (what: string): DOMException => new DOMException(`missing ${what}`, "NotFoundError");

class MemoryFileHandle {
    readonly kind = "file" as const;

    constructor(
        readonly name: string,
        private readonly read: () => string | undefined,
        private readonly write: (value: string) => void,
    ) {}

    async getFile(): Promise<File> {
        const data = this.read();
        if (data === undefined) throw notFound(`file ${this.name}`);
        return new File([data], this.name, {type: "application/json"});
    }

    async createWritable(): Promise<{write(data: Blob | string): Promise<void>; close(): Promise<void>}> {
        let pending = "";
        return {
            write: async (data: Blob | string) => {
                pending = typeof data === "string" ? data : await data.text();
            },
            close: async () => {
                this.write(pending);
            },
        };
    }
}

class MemoryDirectoryHandle {
    readonly kind = "directory" as const;
    readonly files = new Map<string, string>();
    readonly subdirs = new Map<string, MemoryDirectoryHandle>();

    constructor(readonly name = "projects") {}

    async getFileHandle(name: string, options?: {create?: boolean}): Promise<MemoryFileHandle> {
        if (!this.files.has(name) && !options?.create) {
            throw notFound(`file ${name}`);
        }
        if (!this.files.has(name)) this.files.set(name, "");
        return new MemoryFileHandle(name, () => this.files.get(name), v => this.files.set(name, v));
    }

    async getDirectoryHandle(name: string, options?: {create?: boolean}): Promise<MemoryDirectoryHandle> {
        if (!this.subdirs.has(name)) {
            if (!options?.create) throw notFound(`directory ${name}`);
            this.subdirs.set(name, new MemoryDirectoryHandle(name));
        }
        return this.subdirs.get(name)!;
    }

    async removeEntry(name: string): Promise<void> {
        this.files.delete(name);
        this.subdirs.delete(name);
    }

    async *entries(): AsyncIterableIterator<[string, MemoryFileHandle | MemoryDirectoryHandle]> {
        for (const name of this.files.keys()) {
            yield [name, new MemoryFileHandle(name, () => this.files.get(name), v => this.files.set(name, v))];
        }
        for (const [name, sub] of this.subdirs) {
            yield [name, sub];
        }
    }

    /** Test helper: stage an asset subdirectory with a manifest + asset files. */
    seedAssetDir(projectId: string, manifest: unknown, assetFiles: Record<string, string> = {}): MemoryDirectoryHandle {
        const sub = new MemoryDirectoryHandle(projectId);
        sub.files.set("assets.json", typeof manifest === "string" ? manifest : JSON.stringify(manifest));
        for (const [file, content] of Object.entries(assetFiles)) sub.files.set(file, content);
        this.subdirs.set(projectId, sub);
        return sub;
    }
}

describe("FileSystemProjectStore", () => {
    let dir: MemoryDirectoryHandle;
    let store: FileSystemProjectStore;

    beforeEach(() => {
        dir = new MemoryDirectoryHandle();
        store = new FileSystemProjectStore(dir as never);
    });

    it("removes stale same-id filenames after a rename save", async () => {
        const first = await store.save(sampleBody("Old Name"));
        await store.save(sampleBody("New Name", first.id));

        const names = [...dir.files.keys()];
        expect(names).toHaveLength(1);
        expect(names[0]).toContain("New_Name");

        const loaded = await store.load(first.id);
        expect(loaded.meta.name).toBe("New Name");
    });

    it("deletes all same-id files when cleaning up an existing duplicate folder", async () => {
        const id = "project-1";
        const oldBody = sampleBody("Old", id);
        const newBody = sampleBody("New", id);
        oldBody.meta.updatedAt = "2026-01-01T00:00:00.000Z";
        newBody.meta.updatedAt = "2026-01-02T00:00:00.000Z";
        dir.files.set(`Old.${id}.stemscript.json`, JSON.stringify(oldBody));
        dir.files.set(`New.${id}.stemscript.json`, JSON.stringify(newBody));

        const loaded = await store.load(id);
        expect(loaded.meta.name).toBe("New");

        await store.delete(id);
        expect([...dir.files.keys()]).toEqual([]);
    });

    // --- loadAssets must not silently mask a read failure as "no assets". ---

    it("loadAssets returns [] when the project has no asset subdirectory", async () => {
        // Legitimate absence (NotFoundError) — the one quiet path that's allowed.
        await expect(store.loadAssets("project-without-assets")).resolves.toEqual([]);
    });

    it("loadAssets returns the recorded assets when the manifest is valid", async () => {
        dir.seedAssetDir(
            "project-1",
            [{file: "a.glb", assetId: "a", revisionId: "r", type: "model", name: "A"}],
            {"a.glb": "GLBDATA"},
        );
        const assets = await store.loadAssets("project-1");
        expect(assets).toHaveLength(1);
        expect(assets[0]!.assetId).toBe("a");
    });

    it("loadAssets THROWS on a corrupt asset manifest instead of pretending there are no assets", async () => {
        // A manifest that exists but is unreadable must surface — returning []
        // here would silently drop every model on reload.
        dir.seedAssetDir("project-1", "{ this is not valid json");
        await expect(store.loadAssets("project-1")).rejects.toThrow(/manifest.*unreadable|malformed/i);
    });

    it("loadAssets THROWS when a manifest-listed asset file is missing", async () => {
        // The manifest references b.glb but the file isn't there — a real,
        // data-losing problem, not an empty project.
        dir.seedAssetDir(
            "project-1",
            [{file: "b.glb", assetId: "b", revisionId: "r", type: "model", name: "B"}],
            /* no b.glb on disk */
        );
        await expect(store.loadAssets("project-1")).rejects.toThrow();
    });
});
