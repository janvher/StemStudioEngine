import type {ProjectStore} from "./ProjectStore";
import type {
    ListProjectsOptions,
    ListProjectsResult,
    ProjectBody,
    ProjectMeta,
} from "./types";

const DB_NAME = "stemstudio-projects";
const STORE_NAME = "projects";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | undefined;

const openDb = (): Promise<IDBDatabase> => {
    if (!dbPromise) {
        dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === "undefined") {
                reject(new Error("IndexedDB is not available"));
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, {keyPath: "meta.id"});
                    store.createIndex("byUpdatedAt", "meta.updatedAt");
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error ?? new Error("Failed to open projects DB"));
        });
    }
    return dbPromise;
};

const txGet = <T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    openDb().then(
        db =>
            new Promise<T>((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, mode);
                const store = tx.objectStore(STORE_NAME);
                const req = fn(store);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
            }),
    );

const nowIso = (): string => new Date().toISOString();

const newId = (): string => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `proj_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
};

export class IndexedDBProjectStore implements ProjectStore {
    readonly kind = "indexeddb" as const;

    async list(options: ListProjectsOptions = {}): Promise<ListProjectsResult> {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.max(1, options.limit ?? 40);
        const search = options.search?.trim().toLowerCase() ?? "";

        const all = await txGet<ProjectBody[]>("readonly", store => store.getAll());

        const filtered = search
            ? all.filter(p => p.meta.name.toLowerCase().includes(search))
            : all;

        const sorted = filtered.sort(
            (a, b) =>
                new Date(b.meta.updatedAt).getTime() - new Date(a.meta.updatedAt).getTime(),
        );

        const start = (page - 1) * limit;
        const slice = sorted.slice(start, start + limit);

        return {
            projects: slice.map(p => p.meta),
            page,
            hasMore: start + slice.length < sorted.length,
            totalCount: sorted.length,
        };
    }

    async load(id: string): Promise<ProjectBody> {
        const result = await txGet<ProjectBody | undefined>("readonly", store => store.get(id));
        if (!result) throw new Error(`Project ${id} not found`);
        return result;
    }

    async save(body: ProjectBody): Promise<ProjectMeta> {
        const meta: ProjectMeta = {
            ...body.meta,
            id: body.meta.id || newId(),
            createdAt: body.meta.createdAt || nowIso(),
            updatedAt: nowIso(),
        };
        const toStore: ProjectBody = {...body, meta};
        await txGet("readwrite", store => store.put(toStore));
        return meta;
    }

    async delete(id: string): Promise<void> {
        await txGet("readwrite", store => store.delete(id));
    }

    async exportToBlob(id: string): Promise<Blob> {
        const body = await this.load(id);
        return new Blob([JSON.stringify(body, null, 2)], {type: "application/json"});
    }

    async importFromBlob(blob: Blob): Promise<ProjectMeta> {
        const text = await blob.text();
        const parsed = JSON.parse(text) as ProjectBody;
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
