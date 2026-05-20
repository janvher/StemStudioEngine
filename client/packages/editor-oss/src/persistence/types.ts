/**
 * Project save/load types used by the persistence abstraction.
 *
 * The shapes intentionally avoid coupling to FileData / PaginatedScenesResponse
 * (which are the wire shapes of the cloud Scene API). The HTTP-backed
 * implementation translates between the two so the rest of the editor can be
 * agnostic about storage mode.
 */

export type ProjectStoreKind = "remote" | "indexeddb" | "filesystem";

/**
 * Metadata only — no scene body. Used for listings.
 */
export interface ProjectMeta {
    id: string;
    name: string;
    updatedAt: string; // ISO8601
    createdAt: string;
    thumbnailUrl?: string;
    /** Optional storage-specific extras (cloud version, FS handle name, etc.). */
    extra?: Record<string, unknown>;
}

/**
 * Full project body. Shape mirrors the .stemscript on-disk format so a
 * loaded project from any backend is structurally interchangeable.
 */
export interface ProjectBody {
    meta: ProjectMeta;
    /**
     * Serialized scene JSON. Stored as a string to avoid re-parsing on
     * round trips through IndexedDB / FS, and to support large projects
     * without losing precision on nested numerics.
     */
    sceneJson: string;
    /**
     * Optional behavior / script asset bodies bundled with the project.
     * Map key is the asset id; value is the source. This is what makes the
     * project portable across machines without a behavior server.
     */
    bundledAssets?: Record<string, string>;
}

export interface ListProjectsOptions {
    /** 1-based page index. Default 1. */
    page?: number;
    /** Items per page. Default 40. */
    limit?: number;
    /** Plain text search filter. Optional. */
    search?: string;
}

export interface ListProjectsResult {
    projects: ProjectMeta[];
    page: number;
    hasMore: boolean;
    totalCount: number;
}
