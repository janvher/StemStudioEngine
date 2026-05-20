import React, {useEffect, useState} from "react";

import {useLibrariesContext} from "@stem/editor-oss/context";
import {EmptyListMessage} from "../../AssetsLibrary.style";
import {AssetCard} from "../AssetCard/AssetCard";
import {folderToAssetTypes} from "../folderAssetTypes";
import {FoldersList} from "../FoldersView.style";
import {useListImportableSceneAssets} from "../hooks";

export interface FolderProps {
    setNoAssets?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FolderContent = () => {
    const {activeFolder, activeSceneLibrary, setCurrentAssets, filteredAndSortedAssets} = useLibrariesContext();
    const [noAssets, setNoAssets] = useState(false);
    const assetTypes = folderToAssetTypes[activeFolder!];
    const {assets, isLoading} = useListImportableSceneAssets(activeSceneLibrary?.ID || "missing-scene-id", {
        types: assetTypes,
        includeThumbnails: true,
        enabled: Boolean(activeSceneLibrary?.ID),
    });

    useEffect(() => {
        if (!isLoading) {
            setCurrentAssets(assets);
            setNoAssets?.(assets.length === 0);
        }
        return () => {
            setCurrentAssets([]);
        };
    }, [assets, isLoading]);

    return (
        <FoldersList>
            {noAssets ? 
                <EmptyListMessage style={{gridColumn: "1/-1"}}>No assets available.</EmptyListMessage>
             : 
                filteredAndSortedAssets.map(asset => <AssetCard key={asset.id}
                    asset={asset}
                                                     />)
            }
        </FoldersList>
    );
};
