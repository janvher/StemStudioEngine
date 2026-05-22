import type {ProjectStore} from "./ProjectStore";
import type {
    ListProjectsOptions,
    ListProjectsResult,
    ProjectBody,
    ProjectMeta,
    StoredAsset,
} from "./types";

/**
 * RemoteProjectStore wraps the existing cloud Scene API behind the ProjectStore
 * interface. Used by integrated mode so save/load paths can migrate onto the
 * abstraction one call site at a time without bypassing the cloud backend.
 *
 * The implementation is intentionally injected via `RemoteProjectStoreDeps`
 * rather than importing the cloud Scene API directly. This keeps the OSS
 * package boundary clean (editor-oss must not import `@web/network/api/scene`),
 * and lets integrated bootstrap wire the dependency at app startup.
 */

export interface RemoteSceneListItem {
    ID: string;
    Name: string;
    UpdateTime: string;
    CreateTime?: string;
    Thumbnail?: string;
}

export interface RemoteSceneListResult {
    Scenes: RemoteSceneListItem[];
    Page: number;
    HasMore: boolean;
    TotalCount: number;
}

export interface RemoteSceneLoadResult {
    data: unknown;
    metadata?: {Name?: string; UpdateTime?: string; CreateTime?: string; Thumbnail?: string} | unknown;
}

export interface RemoteProjectStoreDeps {
    fetchScenes(params: {page: number; limit: number; search?: string}): Promise<RemoteSceneListResult>;
    loadScene(id: string): Promise<RemoteSceneLoadResult>;
    saveScene(body: ProjectBody): Promise<ProjectMeta>;
    deleteScene(id: string): Promise<void>;
}

const itemToMeta = (s: RemoteSceneListItem): ProjectMeta => ({
    id: s.ID,
    name: s.Name,
    updatedAt: s.UpdateTime,
    createdAt: s.CreateTime ?? s.UpdateTime,
    thumbnailUrl: s.Thumbnail,
});

export class RemoteProjectStore implements ProjectStore {
    readonly kind = "remote" as const;

    constructor(private readonly deps: RemoteProjectStoreDeps) {}

    async list(options: ListProjectsOptions = {}): Promise<ListProjectsResult> {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.max(1, options.limit ?? 40);
        const result = await this.deps.fetchScenes({page, limit, search: options.search});
        return {
            projects: result.Scenes.map(itemToMeta),
            page: result.Page,
            hasMore: result.HasMore,
            totalCount: result.TotalCount,
        };
    }

    async load(id: string): Promise<ProjectBody> {
        const remote = await this.deps.loadScene(id);
        const meta = (remote.metadata ?? {}) as {Name?: string; UpdateTime?: string; CreateTime?: string; Thumbnail?: string};
        return {
            meta: {
                id,
                name: meta.Name ?? "Untitled",
                updatedAt: meta.UpdateTime ?? new Date().toISOString(),
                createdAt: meta.CreateTime ?? meta.UpdateTime ?? new Date().toISOString(),
                thumbnailUrl: meta.Thumbnail,
            },
            sceneJson: typeof remote.data === "string" ? remote.data : JSON.stringify(remote.data),
        };
    }

    async save(body: ProjectBody): Promise<ProjectMeta> {
        return this.deps.saveScene(body);
    }

    async delete(id: string): Promise<void> {
        await this.deps.deleteScene(id);
    }

    async exportToBlob(id: string): Promise<Blob> {
        const body = await this.load(id);
        return new Blob([JSON.stringify(body, null, 2)], {type: "application/json"});
    }

    async importFromBlob(blob: Blob): Promise<ProjectMeta> {
        const text = await blob.text();
        const parsed = JSON.parse(text) as ProjectBody;
        if (!parsed?.sceneJson) throw new Error("Imported file is not a valid .stemscript project");
        return this.save(parsed);
    }

    // Integrated mode persists assets through the cloud asset service, so
    // the project store has nothing to store. These satisfy the interface.
    async saveAssets(_projectId: string, _assets: StoredAsset[]): Promise<void> {
        // no-op: cloud asset service owns asset persistence
    }

    async loadAssets(_projectId: string): Promise<StoredAsset[]> {
        return [];
    }
}
