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

class MemoryFileHandle {
    readonly kind = "file" as const;

    constructor(
        readonly name: string,
        private readonly dir: MemoryDirectoryHandle,
    ) {}

    async getFile(): Promise<File> {
        const data = this.dir.files.get(this.name);
        if (data === undefined) throw new Error(`missing file ${this.name}`);
        return new File([data], this.name, {type: "application/json"});
    }

    async createWritable(): Promise<{write(data: Blob | string): Promise<void>; close(): Promise<void>}> {
        let pending = "";
        return {
            write: async (data: Blob | string) => {
                pending = typeof data === "string" ? data : await data.text();
            },
            close: async () => {
                this.dir.files.set(this.name, pending);
            },
        };
    }
}

class MemoryDirectoryHandle {
    readonly kind = "directory" as const;
    readonly name = "projects";
    readonly files = new Map<string, string>();

    async getFileHandle(name: string, options?: {create?: boolean}): Promise<MemoryFileHandle> {
        if (!this.files.has(name) && !options?.create) {
            throw new Error(`missing file ${name}`);
        }
        if (!this.files.has(name)) {
            this.files.set(name, "");
        }
        return new MemoryFileHandle(name, this);
    }

    async removeEntry(name: string): Promise<void> {
        this.files.delete(name);
    }

    async *entries(): AsyncIterableIterator<[string, MemoryFileHandle]> {
        for (const name of this.files.keys()) {
            yield [name, new MemoryFileHandle(name, this)];
        }
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
});
