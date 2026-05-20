import { QueryClient } from '@tanstack/react-query';

import { AssetType } from '@stem/network/api/asset';
import { resolveAssetRevisionId } from '@stem/editor-oss/asset-management/AssetResolutionContext';
import { listEditorAssets } from '../../asset-management/hooks/assets';
import { BehaviorAttributeData, PrefabAttribute } from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import { BehaviorContext } from '../BehaviorContextProvider';
import AttributeConverter from "./AttributeConverter";

/**
 * Loads all prefabs from the cached prefabs list in the editor
 */
class PrefabAttributeConverter implements AttributeConverter {
    constructor(private readonly queryClient: QueryClient) {
    }

    convertAttribute(
        attributeData: BehaviorAttributeData,
        behaviorContext: BehaviorContext,
    ): PrefabAttribute {
        const assetResolutionContext = behaviorContext.scene?.assetResolutionContext;
        const assetSource = behaviorContext.scene?.assetSource;

        // Fetch the list of prefabs from the active editor source. The
        // queryClient caches under the shared editor-list key, so multiple
        // converters hitting the same source share one request.
        const query = assetSource
            ? listEditorAssets(this.queryClient, assetSource, {types: [AssetType.Prefab]})
            : Promise.resolve({assets: []});

        // Convert the list of prefabs into a list of options
        const optionsPromise = query
            .then(({ assets }) => {
                return assets.map(prefab => {
                    // Determine the correct revision ID for this prefab based
                    // on the asset resolution context. If there is no context,
                    // use the head revision ID.
                    let revisionId = null;
                    if (assetResolutionContext) {
                        revisionId = resolveAssetRevisionId(
                            prefab.id,
                            assetResolutionContext,
                        );
                    }

                    revisionId = revisionId || prefab.headRevisionId;
                    
                    return {
                        name: prefab.name,
                        assetRef: { assetId: prefab.id, revisionId },
                    };
                });
            })
            .catch((error) => {
                console.error("Failed to get prefabs for PrefabAttributeConverter", error);
                return [];
            });

        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Prefab,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default || "",
            order: attributeData.order || 0,
            optionsPromise, // The widget UI will use this to populate the dropdown
        };
    }
}

export default PrefabAttributeConverter;
