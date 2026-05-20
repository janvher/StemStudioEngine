import { Object3D } from 'three';

/**
 * A context for asset resolution that maps IDs to revisions.
 * 
 * @remarks
 * This decouples IDs stored in scenes and prefabs from "real" asset IDs and
 * revisions that they point to.
 * 
 * This provides several advantages:
 * - It allows us to switch environments (e.g. staging vs production) without
 *   having to change the IDs stored in scenes and prefabs.
 * - It allows us to switch revisions without having to change the IDs stored
 *   in scenes and prefabs.
 */
export type AssetResolutionContext = {
    logicalIdToAssetId?: Record<string, string>;
    assetIdToRevisionId?: Record<string, string>;
    nameToAssetId?: Record<string, string>;
};

export type ReadonlyAssetResolutionContext = Readonly<{
    readonly logicalIdToAssetId?: Readonly<Record<string, string>>;
    readonly assetIdToRevisionId?: Readonly<Record<string, string>>;
    readonly nameToAssetId?: Readonly<Record<string, string>>;
}>;

export const emptyAssetResolutionContext: ReadonlyAssetResolutionContext = {} as const;

export const mergeAssetResolutionContexts = (
    ...contexts: Array<ReadonlyAssetResolutionContext | null | undefined>
): AssetResolutionContext => {
    return contexts.reduce<AssetResolutionContext>((acc, context) => {
        if (!context) {
            return acc;
        }

        return {
            logicalIdToAssetId: {
                ...acc.logicalIdToAssetId,
                ...context.logicalIdToAssetId,
            },
            assetIdToRevisionId: {
                ...acc.assetIdToRevisionId,
                ...context.assetIdToRevisionId,
            },
            nameToAssetId: {
                ...acc.nameToAssetId,
                ...context.nameToAssetId,
            },
        };
    }, {});
};

export const setAssetResolutionContext = (object: Object3D, context: AssetResolutionContext | null) => {
    if (!context) {
        delete object.userData.assetResolutionContext;
    } else {
        object.userData.assetResolutionContext = context;
    }
};

export const setAssetRevision = (object: Object3D, assetId: string, revision: string) => {
    const context = getAssetResolutionContext(object) || {};

    const newAssetIdToRevisionId = {
        ...context.assetIdToRevisionId,
        [assetId]: revision,
    };

    setAssetResolutionContext(object, {
        ...context,
        assetIdToRevisionId: newAssetIdToRevisionId,
    });
};

export const removeAssetRevision = (object: Object3D, assetId: string) => {
    const context = getAssetResolutionContext(object);
    if (!context) {
        return;
    }

    const newAssetIdToRevisionId = {
        ...context.assetIdToRevisionId,
    };

    delete newAssetIdToRevisionId[assetId];

    setAssetResolutionContext(object, {
        ...context,
        assetIdToRevisionId: newAssetIdToRevisionId,
    });
};

/**
 * Get the asset resolution context for an object.
 * 
 * @remarks
 * If `inherit` is `true`, the context will be merged with the parent's context.
 * 
 * @param object - The object
 * @param inherit - Whether to inherit the context from the parent
 * @returns The resolution context or `null` if none is set
 */
export const getAssetResolutionContext = (
    object: Object3D,
    inherit = false,
): ReadonlyAssetResolutionContext | null => {
    let context =  object.userData?.assetResolutionContext as ReadonlyAssetResolutionContext | undefined | null;

    if (inherit && object.parent) {
        const parentContext = getAssetResolutionContext(object.parent, true);
        if (parentContext) {
            context = {
                logicalIdToAssetId: {
                    ...parentContext.logicalIdToAssetId,
                    ...context?.logicalIdToAssetId,
                },
                assetIdToRevisionId: {
                    ...parentContext.assetIdToRevisionId,
                    ...context?.assetIdToRevisionId,
                },
                nameToAssetId: {
                    ...parentContext.nameToAssetId,
                    ...context?.nameToAssetId,
                },
            };
        }
    }

    return context || null;
};

export const resolveAssetId = (assetId: string, context: ReadonlyAssetResolutionContext): string => {
    return context.logicalIdToAssetId?.[assetId]
        || context.nameToAssetId?.[assetId.trim().toLowerCase()]
        || assetId;
};

export const resolveAssetRevisionId = (assetId: string, context: ReadonlyAssetResolutionContext): string | undefined => {
    // First apply the logical ID -> asset ID mapping.
    const realAssetId = resolveAssetId(assetId, context);

    // Then apply the asset ID -> revision ID mapping.
    return context.assetIdToRevisionId?.[realAssetId];
};
