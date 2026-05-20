import type {ProjectStore} from "./ProjectStore";
import type {
    ListProjectsOptions,
    ListProjectsResult,
    ProjectBody,
    ProjectMeta,
} from "./types";

/**
 * Chromium-only project store backed by the File System Access API. Each
 * project is one `.stemscript` JSON file inside a user-picked directory.
 *
 * The directory handle is supplied at construction time. The first-time
 * bootstrap modal is responsible for prompting the user and persisting the
 * handle (in IndexedDB) for re-use across sessions.
 */

// Subset of the File System Access API types so we don't pull in a full lib
// dep. The runtime check `isFileSystemAccessSupported()` is the source of
// truth for whether these are actually available.
type FsFileHandle = {
    kind: "file";
    name: string;
    getFile(): Promise<File>;
    createWritable(options?: {keepExistingData?: boolean}): Promise<{
        write(data: Blob | string): Promise<void>;
        close(): Promise<void>;
    }>;
};
type FsDirectoryHandle = {
    kind: "directory";
    name: string;
    getFileHandle(name: string, options?: {create?: boolean}): Promise<FsFileHandle>;
    removeEntry(name: string, options?: {recursive?: boolean}): Promise<void>;
    entries(): AsyncIterableIterator<[string, FsFileHandle | FsDirectoryHandle]>;
};

const SUFFIX = ".stemscript.json";

export const isFileSystemAccessSupported = (): boolean =>
    typeof window !== "undefined" &&
    typeof (window as unknown as {showDirectoryPicker?: unknown}).showDirectoryPicker === "function";

const nowIso = (): string => new Date().toISOString();

const newId = (): string =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `proj_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const sanitizeName = (name: string): string =>
    name.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80) || "untitled";

const filenameFor = (meta: ProjectMeta): string => `${sanitizeName(meta.name)}.${meta.id}${SUFFIX}`;

export class FileSystemProjectStore implements ProjectStore {
    readonly kind = "filesystem" as const;

    constructor(private readonly dir: FsDirectoryHandle) {}

    /** Folder name the user picked, surfaced in the dashboard UI. */
    getDirectoryName(): string {
        return this.dir.name;
    }

    async list(options: ListProjectsOptions = {}): Promise<ListProjectsResult> {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.max(1, options.limit ?? 40);
        const search = options.search?.trim().toLowerCase() ?? "";

        const all: ProjectMeta[] = [];
        for await (const [name, handle] of this.dir.entries()) {
            if (handle.kind !== "file" || !name.endsWith(SUFFIX)) continue;
            try {
                const file = await (handle).getFile();
                const body = JSON.parse(await file.text()) as ProjectBody;
                if (body?.meta) all.push(body.meta);
            } catch {
                // Skip unreadable / malformed files; don't fail the whole list.
            }
        }

        const filtered = search ? all.filter(p => p.name.toLowerCase().includes(search)) : all;
        const sorted = filtered.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        const start = (page - 1) * limit;
        const slice = sorted.slice(start, start + limit);

        return {
            projects: slice,
            page,
            hasMore: start + slice.length < sorted.length,
            totalCount: sorted.length,
        };
    }

    private async matchingNamesForId(id: string): Promise<string[]> {
        const matches: string[] = [];
        for await (const [name, handle] of this.dir.entries()) {
            if (handle.kind === "file" && name.endsWith(SUFFIX) && name.includes(`.${id}.`)) {
                matches.push(name);
            }
        }
        return matches;
    }

    private async resolveHandleForId(id: string): Promise<FsFileHandle> {
        let best: {handle: FsFileHandle; updatedAt: number} | undefined;
        for await (const [name, handle] of this.dir.entries()) {
            if (handle.kind !== "file" || !name.endsWith(SUFFIX) || !name.includes(`.${id}.`)) {
                continue;
            }
            let updatedAt = 0;
            try {
                const file = await handle.getFile();
                const body = JSON.parse(await file.text()) as ProjectBody;
                updatedAt = new Date(body.meta?.updatedAt ?? 0).getTime();
            } catch {
                // Keep malformed matches as a last-resort candidate so the
                // load error still points at the project file instead of
                // pretending it doesn't exist.
            }
            if (!best || updatedAt > best.updatedAt) {
                best = {handle, updatedAt};
            }
        }
        if (best) return best.handle;
        throw new Error(`Project ${id} not found in folder`);
    }

    async load(id: string): Promise<ProjectBody> {
        const handle = await this.resolveHandleForId(id);
        const file = await handle.getFile();
        return JSON.parse(await file.text()) as ProjectBody;
    }

    async save(body: ProjectBody): Promise<ProjectMeta> {
        const meta: ProjectMeta = {
            ...body.meta,
            id: body.meta.id || newId(),
            createdAt: body.meta.createdAt || nowIso(),
            updatedAt: nowIso(),
        };
        const toStore: ProjectBody = {...body, meta};
        const targetName = filenameFor(meta);
        const staleNames = (await this.matchingNamesForId(meta.id)).filter(name => name !== targetName);
        const handle = await this.dir.getFileHandle(targetName, {create: true});
        const writable = await handle.createWritable();
        try {
            await writable.write(JSON.stringify(toStore, null, 2));
        } finally {
            await writable.close();
        }
        for (const name of staleNames) {
            await this.dir.removeEntry(name);
        }
        return meta;
    }

    async delete(id: string): Promise<void> {
        for (const name of await this.matchingNamesForId(id)) {
            await this.dir.removeEntry(name);
        }
    }

    async exportToBlob(id: string): Promise<Blob> {
        const body = await this.load(id);
        return new Blob([JSON.stringify(body, null, 2)], {type: "application/json"});
    }

    async importFromBlob(blob: Blob): Promise<ProjectMeta> {
        const parsed = JSON.parse(await blob.text()) as ProjectBody;
        if (!parsed || typeof parsed !== "object" || !parsed.sceneJson) {
            throw new Error("Imported file is not a valid .stemscript project");
        }
        const incoming: ProjectMeta = parsed.meta ?? {
            id: "",
            name: "Imported project",
            updatedAt: nowIso(),
            createdAt: nowIso(),
        };
        return this.save({
            ...parsed,
            meta: {...incoming, id: newId(), createdAt: nowIso(), updatedAt: nowIso()},
        });
    }
}
