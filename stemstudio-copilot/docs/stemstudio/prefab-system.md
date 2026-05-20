# Prefab System

Prefab/Stem lifecycle, AssetRef, serialization, and instantiation.

## Terminology

| API Term | UI Term | Meaning |
|----------|---------|---------|
| Prefab | Stem | Reusable object template |
| Prefab Instance | Stem Instance | Object cloned from a prefab |

## AssetRef

Prefabs are stored as versioned assets:

```typescript
interface AssetRef {
  assetId: string;      // Unique asset identifier
  revisionId: string;   // Specific version/revision
}
```

## Serialization

Source: `web/src/prefab/serialization.ts`

### serializePrefab

Converts any Object3D into a storable prefab:

```typescript
function serializePrefab(object: Object3D): SerializePrefabResult;

interface SerializePrefabResult {
  data: string;  // JSON string of serialized object tree
  assetResolutionContext: AssetResolutionContext;
}
```

Process:
1. Clones the object (non-destructive)
2. Locks the clone (serialized prefabs are read-only)
3. Maps all asset references to logical IDs
4. Serializes to JSON via `Converter`
5. Returns data + asset resolution context

### AssetResolutionContext

Maps logical asset IDs to real asset IDs, enabling prefabs to work across environments (dev vs production):

```typescript
interface AssetResolutionContext {
  assetIdToRevisionId: Record<string, string>;  // asset → revision mapping
  logicalIdToAssetId: Record<string, string>;   // logical → real asset mapping
}
```

### Deserialization

Loading a prefab resolves its dependencies and instantiates the object tree:

```typescript
async function loadPrefab(id: string, context: AssetResolutionContext): Promise<Object3D>;
```

Dependencies (behaviors, models, textures) are resolved via the `AssetResolutionContext`.

## Prefab Locking

| State | Description |
|-------|-------------|
| **Locked** | Read-only instance; edits create a new revision |
| **Unlocked** | Editable instance; changes apply to the scene copy only |

Utility functions: `isPrefabUnlocked(object)`, `lockPrefab(object)`, `setPrefabId(object, id)`

Serialized prefabs are always locked. The editor unlocks instances for editing.

## Agent Commands

| Command | Method | Required Params | Optional Params |
|---------|--------|-----------------|-----------------|
| `list_prefabs` | GET | — | filter |
| `get_prefab` | GET | id | — |
| `create_prefab` | POST | target | name, createThumbnail |
| `add_prefab_to_scene` | POST | id | position, name |

### Creating a Prefab

1. Select an object in the scene
2. Call `create_prefab` with the object as `target`
3. Engine serializes the object + generates thumbnail
4. Prefab is stored as an asset with type `Prefab`

### Adding a Prefab to Scene

1. Call `add_prefab_to_scene` with the prefab `id`
2. Engine fetches the asset, resolves dependencies
3. Deserializes into Object3D tree
4. Sets name (auto-generates unique name if not provided)
5. Positions at specified location or in front of camera
6. Executes `AddObjectCommand` (undo-able)

### PrefabHandlers (Agent Integration)

Source: `web/src/agent/handlers/PrefabHandlers.ts`

```typescript
handleListPrefabs({ filter? }): Promise<CommandResult>
handleGetPrefab({ id }): Promise<CommandResult>
handleCreatePrefab({ target, name?, createThumbnail? }): Promise<CommandResult>
handleAddPrefabToScene({ id, position?, name? }): Promise<CommandResult>
```

## Storage

Prefabs are stored as assets in the backend:
- Type: `AssetType.Prefab`
- Format: JSON
- Dependencies tracked in `assetResolutionContext.assetIdToRevisionId`
- Metadata includes `logicalAssetIdMap` for cross-environment portability
- Thumbnails stored as derivatives of the asset
