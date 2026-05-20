import Ajax from "@web-shared/utils/Ajax";
import {backendUrlFromPath} from "@web-shared/utils/UrlUtils";

// ----------------------------------------------------------------------------
// Admin / catalogue side — populated by scripts/import-avatars.mjs
// ----------------------------------------------------------------------------

/**
 * Minimal record returned by `/api/avatarCreator/avatar` GET — the catalogue
 * of premade avatars the bootstrap script registered. Display metadata is
 * resolved separately via the Assets API.
 */
export type AvatarCreatorRecord = {
    id: string;
    assetId: string;
};

export type CatalogueAvatar = {
    id: string;
    assetId: string;
    revisionId?: string;
    name: string;
    thumbnail: string | null;
};

type RawAssetDto = {
    id: string;
    name?: string;
    headRevisionId?: string;
    thumbnailUrl?: string;
    dataUrl?: string;
    format?: string;
};

export const listCatalogueAvatars = async (): Promise<AvatarCreatorRecord[]> => {
    const resp = await Ajax.get({
        url: backendUrlFromPath("/api/avatarCreator/avatar"),
        needAuthorization: false,
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        throw new Error(`Failed to fetch catalogue avatars (status ${resp?.status ?? "n/a"})`);
    }
    let data = resp.data;
    if (data?.Code !== undefined && data?.Data !== undefined) {
        data = data.Data;
    }
    return Array.isArray(data) ? (data as AvatarCreatorRecord[]) : [];
};

export const resolveAvatarAssets = async (assetIds: string[]): Promise<Map<string, RawAssetDto>> => {
    if (!assetIds.length) return new Map();
    try {
        const resp = await Ajax.get({
            url: backendUrlFromPath(
                `/api/asset?ids=${assetIds.join(",")}&types=model&include=thumbnails&limit=100`,
            ),
            needAuthorization: false,
        });
        const list = Array.isArray(resp?.data?.assets) ? (resp.data.assets as RawAssetDto[]) : [];
        const map = new Map<string, RawAssetDto>();
        for (const asset of list) {
            if (asset?.id) map.set(asset.id, asset);
        }
        return map;
    } catch (e) {
        console.warn("resolveAvatarAssets failed", e);
        return new Map();
    }
};

export const listCatalogueAvatarsHydrated = async (): Promise<CatalogueAvatar[]> => {
    const records = await listCatalogueAvatars();
    const assetIds = records.map(r => r.assetId).filter(Boolean);
    const assetMap = await resolveAvatarAssets(assetIds);
    const out: CatalogueAvatar[] = [];
    for (const rec of records) {
        const meta = assetMap.get(rec.assetId);
        if (!meta) continue;
        out.push({
            id: rec.id,
            assetId: rec.assetId,
            revisionId: meta.headRevisionId,
            name: meta.name ?? "Avatar",
            thumbnail: meta.thumbnailUrl ?? null,
        });
    }
    return out;
};

// ----------------------------------------------------------------------------
// Per-user collection — `/api/avatarCreator/user/avatars/*`
// ----------------------------------------------------------------------------

export const MAX_USER_AVATARS = 9;

export type UserAvatarPart = {
    group: string;
    assetId: string;
    color?: string;
};

export type UserAvatarRecord = {
    id: string;
    userId: string;
    type: "premade" | "composed";
    name?: string;
    isDefault?: boolean;
    createdAt: string;
    updatedAt: string;
    // premade-only:
    assetId?: string;
    revisionId?: string;
    // composed-only:
    parts?: UserAvatarPart[];
    skinTone?: string;
    avatarStyle?: string;
    // optional:
    thumbnail?: string;
};

export type CreatePremadeAvatarInput = {
    assetId: string;
    revisionId?: string;
    name?: string;
    thumbnail?: string;
};

export type CreateComposedAvatarInput = {
    parts: UserAvatarPart[];
    skinTone?: string;
    avatarStyle?: string;
    name?: string;
    thumbnail?: string;
};

/** List the caller's personal avatars. */
export const listMyAvatars = async (): Promise<UserAvatarRecord[]> => {
    const resp = await Ajax.get({
        url: backendUrlFromPath("/api/avatarCreator/user/avatars"),
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        throw new Error(`Failed to list my avatars (status ${resp?.status ?? "n/a"})`);
    }
    const data = resp.data;
    return Array.isArray(data) ? (data as UserAvatarRecord[]) : [];
};

/** Add a premade pointer to the caller's collection. */
export const createMyPremadeAvatar = async (input: CreatePremadeAvatarInput): Promise<UserAvatarRecord> => {
    const resp = await Ajax.post({
        url: backendUrlFromPath("/api/avatarCreator/user/avatars"),
        data: JSON.stringify({type: "premade", ...input}),
        msgBodyType: "json",
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        const status = resp?.status ?? 0;
        if (status === 409) throw new AvatarCapReachedError();
        throw new Error(`Failed to create avatar (status ${status})`);
    }
    return resp.data as UserAvatarRecord;
};

/** Add a composed-assembly avatar to the caller's collection. */
export const createMyComposedAvatar = async (input: CreateComposedAvatarInput): Promise<UserAvatarRecord> => {
    const resp = await Ajax.post({
        url: backendUrlFromPath("/api/avatarCreator/user/avatars"),
        data: JSON.stringify({type: "composed", ...input}),
        msgBodyType: "json",
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        const status = resp?.status ?? 0;
        if (status === 409) throw new AvatarCapReachedError();
        throw new Error(`Failed to create avatar (status ${status})`);
    }
    return resp.data as UserAvatarRecord;
};

/** Update an existing composed user-avatar record in place. */
export const updateMyComposedAvatar = async (
    recordId: string,
    input: CreateComposedAvatarInput,
): Promise<void> => {
    const resp = await Ajax.post({
        url: backendUrlFromPath(`/api/avatarCreator/user/avatars/${recordId}/update`),
        data: JSON.stringify({type: "composed", ...input}),
        msgBodyType: "json",
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        throw new Error(`Failed to update avatar (status ${resp?.status ?? "n/a"})`);
    }
};

/** Mark this record as the caller's default avatar. */
export const setMyDefaultAvatar = async (recordId: string): Promise<void> => {
    const resp = await Ajax.post({
        url: backendUrlFromPath(`/api/avatarCreator/user/avatars/${recordId}/default`),
        data: "",
        msgBodyType: "json",
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        throw new Error(`Failed to set default avatar (status ${resp?.status ?? "n/a"})`);
    }
};

/** Get the caller's default avatar record, or undefined. */
export const getMyDefaultAvatar = async (): Promise<UserAvatarRecord | undefined> => {
    const resp = await Ajax.get({
        url: backendUrlFromPath("/api/avatarCreator/user/avatars/default"),
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        return undefined;
    }
    return resp.data as UserAvatarRecord;
};

/** Delete one of the caller's avatars. */
export const deleteMyAvatar = async (recordId: string): Promise<void> => {
    const resp = await Ajax.post({
        url: backendUrlFromPath(`/api/avatarCreator/user/avatars/${recordId}/delete`),
        data: "",
        msgBodyType: "json",
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        throw new Error(`Failed to delete avatar (status ${resp?.status ?? "n/a"})`);
    }
};

export class AvatarCapReachedError extends Error {
    constructor() {
        super("Avatar limit reached");
        this.name = "AvatarCapReachedError";
    }
}

// ----------------------------------------------------------------------------
// Runtime helpers (used by GameManager / CharacterBehavior)
// ----------------------------------------------------------------------------

export type ResolvedDefaultAvatar =
    | {type: "premade"; assetId: string; revisionId?: string; url: string; format: string}
    | {type: "composed"; parts: UserAvatarPart[]; skinTone?: string; avatarStyle?: string};

/**
 * Resolve the user's default avatar into a runtime-loadable form.
 *
 * - "premade": yields a direct GLB URL the ModelLoader can consume.
 * - "composed": yields the part list; engine-side runtime composer must
 *   assemble it (separate follow-up).
 */
export const getDefaultUserAvatarModel = async (): Promise<ResolvedDefaultAvatar | undefined> => {
    const record = await getMyDefaultAvatar();
    if (!record) return undefined;

    if (record.type === "premade") {
        if (!record.assetId) return undefined;
        try {
            const resp = await Ajax.get({
                url: backendUrlFromPath(`/api/asset?ids=${record.assetId}&types=model&include=data&limit=1`),
            });
            const list = Array.isArray(resp?.data?.assets) ? resp.data.assets : [];
            const asset = list[0] as RawAssetDto | undefined;
            if (!asset?.dataUrl) return undefined;
            return {
                type: "premade",
                assetId: record.assetId,
                revisionId: record.revisionId,
                url: asset.dataUrl,
                format: asset.format || "glb",
            };
        } catch (e) {
            console.warn("getDefaultUserAvatarModel premade resolution failed", e);
            return undefined;
        }
    }

    if (record.type === "composed") {
        return {
            type: "composed",
            parts: record.parts ?? [],
            skinTone: record.skinTone,
            avatarStyle: record.avatarStyle,
        };
    }

    return undefined;
};

// ----------------------------------------------------------------------------
// Per-collection skeleton overrides (admin-authored, all users read)
// ----------------------------------------------------------------------------

import type {SkeletonOverride} from "@web-shared/assets/js/animations/runtimeRig";

/**
 * Result shape from `GET /api/avatarCreator/collectionSkeleton?key=...`.
 * `null` means "no override saved for this collection yet" — NOT an
 * error condition. Callers should fall back to either admin-side CV
 * detection (admins only) or raw Mixamo bones (non-admins).
 */
export type CollectionSkeletonResult =
    | {
          collectionKey: string;
          override: SkeletonOverride;
          updatedBy?: string;
          updatedAt: string;
      }
    | null;

const unwrapEnvelope = (raw: unknown): unknown => {
    if (raw && typeof raw === "object" && raw !== null) {
        const r = raw as {Code?: number; Data?: unknown};
        if (r.Code !== undefined && r.Data !== undefined) return r.Data;
    }
    return raw;
};

/**
 * Fetch the admin-authored skeleton override for the given collection
 * key (usually the Body asset's ID). Returns null when no override is
 * on file.
 */
export const fetchCollectionSkeleton = async (
    collectionKey: string,
): Promise<CollectionSkeletonResult> => {
    if (!collectionKey) return null;
    const resp = await Ajax.get({
        url: backendUrlFromPath(
            `/api/avatarCreator/collectionSkeleton?key=${encodeURIComponent(collectionKey)}`,
        ),
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        return null;
    }
    const data = unwrapEnvelope(resp.data);
    if (!data || typeof data !== "object") return null;
    return data as CollectionSkeletonResult;
};

/**
 * Admin only. Upsert the override blob for a collection key. The
 * backend rejects non-admin callers with HTTP 403 / our Forbidden
 * code; we surface that as a thrown Error so the UI can show it.
 */
export const saveCollectionSkeleton = async (
    collectionKey: string,
    override: SkeletonOverride,
): Promise<void> => {
    if (!collectionKey) throw new Error("Missing collectionKey");
    const resp = await Ajax.post({
        url: backendUrlFromPath(
            `/api/avatarCreator/collectionSkeleton?key=${encodeURIComponent(collectionKey)}`,
        ),
        data: JSON.stringify({override}),
        msgBodyType: "json",
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        throw new Error(`Failed to save collection skeleton (status ${resp?.status ?? "n/a"})`);
    }
    const data = unwrapEnvelope(resp.data) as {Code?: number; Msg?: string} | undefined;
    if (data?.Code !== undefined && data.Code !== 0) {
        throw new Error(data.Msg ?? "Failed to save collection skeleton");
    }
};

/**
 * Admin only. Remove the override for a collection key — used when the
 * admin wants to redo detection from scratch on next session.
 */
export const deleteCollectionSkeleton = async (collectionKey: string): Promise<void> => {
    if (!collectionKey) throw new Error("Missing collectionKey");
    const resp = await Ajax.post({
        url: backendUrlFromPath(
            `/api/avatarCreator/collectionSkeleton/delete?key=${encodeURIComponent(collectionKey)}`,
        ),
        msgBodyType: "json",
    });
    if (!resp || resp.status < 200 || resp.status >= 300) {
        throw new Error(`Failed to delete collection skeleton (status ${resp?.status ?? "n/a"})`);
    }
};
