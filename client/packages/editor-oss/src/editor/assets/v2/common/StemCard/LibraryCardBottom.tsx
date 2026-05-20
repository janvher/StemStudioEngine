import {useState} from "react";
import {createPortal} from "react-dom";

import {AssetType} from "@stem/network/api/asset";
import {DomainAssetDto} from "@stem/network/api/client/api";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useLibrariesContext} from "@stem/editor-oss/context";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {useImportAssets, useImportBehaviors} from "../../AssetsLibrary/services";
import {InfoCard} from "../InfoCard/InfoCard";
import {InfoIcon} from "../InfoCard/InfoIcon";
import {StyledButton} from "../StyledButton";

interface Props {
    asset: DomainAssetDto;
    thumbnail: string;
    defaultIcon?: boolean;
}

type LibraryAssetDto = DomainAssetDto & {
    importRevisionId?: string;
};

export const LibraryCardBottom = ({asset, thumbnail, defaultIcon}: Props) => {
    const {context} = useAssetResolutionContext();
    const importAssets = useImportAssets();
    const importBehaviors = useImportBehaviors();
    const {libraryContainerRef} = useLibrariesContext();
    const [isInfoCardVisible, setIsInfoCardVisible] = useState(false);
    const isAssetInScene = Boolean(resolveAssetRevisionId(asset.id, context));

    const onImportClicked = () => {
        const libraryAsset = asset as LibraryAssetDto;
        const assetRefs = [
            {
                assetId: asset.id,
                revisionId: libraryAsset.importRevisionId || asset.revisionId || asset.headRevisionId,
            },
        ];

        if (asset.type === AssetType.Behavior) {
            void importBehaviors(assetRefs);
        } else {
            void importAssets(assetRefs);
        }
    };

    return (
        <>
            <StyledButton
                className="commonButton"
                width="65px"
                style={{
                    height: "13px",
                    cursor: isAssetInScene ? "auto" : "pointer",
                    fontSize: "10px",
                    whiteSpace: "nowrap",
                }}
                isGreySecondary
                disabled={isAssetInScene}
                onClick={() => !isAssetInScene ? onImportClicked() : undefined}
            >
                {isAssetInScene ? "In Project" : "Add"}
            </StyledButton>
            <InfoIcon setIsCardVisible={setIsInfoCardVisible} />
            {isInfoCardVisible &&
                createPortal(
                    <InfoCard
                        item={asset}
                        thumbnail={thumbnail}
                        isDefaultThumbnail={defaultIcon}
                        isCardVisible={isInfoCardVisible}
                        close={() => setIsInfoCardVisible(false)}
                        inLibrary
                    />,
                    libraryContainerRef.current as HTMLDivElement,
                )}
        </>
    );
};
