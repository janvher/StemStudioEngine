import {QueryClient} from "@tanstack/react-query";

import {AssetType} from "@stem/network/api/asset";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {listEditorAssets} from "../../asset-management/hooks/assets";
import {AssetAttribute, BehaviorAttributeData} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class AssetAttributeConverter implements AttributeConverter {
    constructor(
        private readonly queryClient: QueryClient,
        private readonly assetType: (typeof AssetType)[keyof typeof AssetType],
        private readonly behaviorAttributeType: BehaviorAttributeType,
    ) {}

    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): AssetAttribute {
        const assetResolutionContext = behaviorContext.scene?.assetResolutionContext;
        const assetSource = behaviorContext.scene?.assetSource;

        const query = assetSource
            ? listEditorAssets(this.queryClient, assetSource, {types: [this.assetType]})
            : Promise.resolve({assets: []});

        const optionsPromise = query
            .then(({assets}) => {
                return assets.map(asset => {
                    let revisionId = null;

                    if (assetResolutionContext) {
                        revisionId = resolveAssetRevisionId(asset.id, assetResolutionContext);
                    }

                    revisionId = revisionId || asset.headRevisionId;

                    return {
                        name: asset.name,
                        assetRef: {
                            assetId: asset.id,
                            revisionId,
                        },
                    };
                });
            })
            .catch(error => {
                console.error(`Failed to get assets for AssetAttributeConverter (${this.behaviorAttributeType})`, error);
                return [];
            });

        return {
            name: attributeData.name,
            type: this.behaviorAttributeType,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default ?? "",
            order: attributeData.order || 0,
            optionsPromise,
        };
    }
}

export default AssetAttributeConverter;
