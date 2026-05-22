# Server-side storage & version control

StemStudio works fully offline — projects live in IndexedDB or a folder you
pick via the File System Access API. But the editor never talks to storage
directly. Every save, load, asset, and revision flows through a small set of
**interfaces**. Implement them and the editor runs against your own server,
with full version control.

This page lists the interfaces you implement to add network storage and a
version-controlled, hosted experience.

## Persistence is an interface, not a backend

The OSS build ships three `ProjectStore` implementations and selects one at
runtime. A hosted deployment adds a fourth — yours.

| Implementation | Backing store |
|---|---|
| `IndexedDBProjectStore` | Browser-local (default) |
| `FileSystemProjectStore` | A user-picked folder (File System Access API) |
| `RemoteProjectStore` | HTTP-backed — the seam for your server |

## 1. Project storage — `ProjectStore`

[`client/packages/editor-oss/src/persistence/ProjectStore.ts`](https://github.com/Stem-Studio/Engine/blob/main/client/packages/editor-oss/src/persistence/ProjectStore.ts)

The single seam between the editor's save/load flows and any storage backend:

```ts
interface ProjectStore {
    list(options?): Promise<ListProjectsResult>;
    load(id): Promise<ProjectBody>;
    save(body): Promise<ProjectMeta>;
    delete(id): Promise<void>;
    exportToBlob(id): Promise<Blob>;
    importFromBlob(blob): Promise<ProjectMeta>;
    saveAssets(projectId, assets): Promise<void>;
    loadAssets(projectId): Promise<StoredAsset[]>;
}
```

Implement this interface (or extend the provided
[`RemoteProjectStore`](https://github.com/Stem-Studio/Engine/blob/main/client/packages/editor-oss/src/persistence/RemoteProjectStore.ts))
and register it once at boot with `setProjectStore()` from
[`persistence/projectStoreFactory.ts`](https://github.com/Stem-Studio/Engine/blob/main/client/packages/editor-oss/src/persistence/projectStoreFactory.ts).
`RemoteProjectStore` keeps its transport injectable through
`RemoteProjectStoreDeps` (`fetchScenes`, `loadScene`, `saveScene`,
`deleteScene`) — wire those four functions to your endpoints and you have
network storage.

## 2. Asset storage & dependencies — `AssetSource`

[`client/packages/editor-oss/src/editor/asset-management/AssetSource.ts`](https://github.com/Stem-Studio/Engine/blob/main/client/packages/editor-oss/src/editor/asset-management/AssetSource.ts)

Asset discovery, dependency tracking, and revision creation for models,
behaviors, audio, and textures:

```ts
interface AssetSource {
    getAssets(options?): Promise<AssetSourceResponse>;
    addDependencies(deps): Promise<void>;
    removeDependencies(assetIds): Promise<void>;
    createAsset(params): Promise<Asset>;
    createAssetRevision(params): Promise<AssetRevision>;
}
```

`createAssetRevision` is the per-asset version-control hook — every edit to a
model or behavior can become a new immutable revision.

## 3. Version control

Version control is the **revision model** exposed by the network adapter,
[`@stem/network`](https://github.com/Stem-Studio/Engine/tree/main/client/packages/network).
A hosted backend implements these endpoints:

| Capability | API surface |
|---|---|
| Scene revisions (head vs. published) | `getScene(id, { revision: "head" \| "published", revisionId })` |
| Asset revision history | `createAssetRevision`, `getAssetRevisions` |
| Published-release pinning | `getAssetReleases` |

Together these give the editor full history: every save is a revision,
viewers see the pinned published release, and contributors edit head — the
same model the integrated build runs on.

The OSS build stubs these (revisions resolve to a single synthetic entry,
release lists are empty). Implementing them on your server turns on the full
version-controlled experience.

## Summary — what to implement

1. **`ProjectStore`** — network storage for projects and their assets.
2. **`AssetSource`** — asset discovery and per-asset revisions.
3. **`@stem/network` revision endpoints** — scene/asset revision history and
   published releases for full version control.

Start from `RemoteProjectStore` and the `@stem/network` adapter — both are
written to be re-pointed at your backend without touching editor code.
