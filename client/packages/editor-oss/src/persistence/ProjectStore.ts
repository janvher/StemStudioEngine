import type {
    ListProjectsOptions,
    ListProjectsResult,
    ProjectBody,
    ProjectMeta,
    ProjectStoreKind,
    StoredAsset,
} from "./types";

/**
 * ProjectStore is the seam between the editor's save/load flows and any
 * project storage backend.
 *
 * Implementations:
 *   - RemoteProjectStore     ← HTTP-backed, the current cloud behavior.
 *   - IndexedDBProjectStore  ← OSS default. Browser-local persistence.
 *   - FileSystemProjectStore ← OSS opt-in. Chromium-only. Project lives in a
 *                              user-picked folder as a `.stemscript` file.
 *
 * The interface is intentionally minimal. It does NOT cover community gallery,
 * collaborative sessions, share-link generation, archived/restored flows, or
 * any cloud-only concept — those stay in the cloud-only code paths and are
 * hidden in OSS mode via `IS_OSS`.
 */
export interface ProjectStore {
    readonly kind: ProjectStoreKind;

    list(options?: ListProjectsOptions): Promise<ListProjectsResult>;

    load(id: string): Promise<ProjectBody>;

    save(body: ProjectBody): Promise<ProjectMeta>;

    delete(id: string): Promise<void>;

    /**
     * Serialize a project to a downloadable Blob (`.stemscript` format) for
     * export/share. All implementations support this so a user can move a
     * project between machines or share it as a file.
     */
    exportToBlob(id: string): Promise<Blob>;

    /**
     * Inverse of `exportToBlob`. Reads a `.stemscript` file (or compatible
     * JSON body) and creates a new project. Returns the new project's meta.
     */
    importFromBlob(blob: Blob): Promise<ProjectMeta>;

    /**
     * Persist the binary assets (models, images, audio) a project depends
     * on. Called after `save()`; replaces the project's stored asset set.
     * In OSS these payloads have no asset service to live in, so the
     * project store is their only durable home.
     */
    saveAssets(projectId: string, assets: StoredAsset[]): Promise<void>;

    /**
     * Load every binary asset previously persisted for a project. Used on
     * scene load to re-seed the in-memory OSS asset registry so model /
     * image / audio references resolve.
     */
    loadAssets(projectId: string): Promise<StoredAsset[]>;
}
