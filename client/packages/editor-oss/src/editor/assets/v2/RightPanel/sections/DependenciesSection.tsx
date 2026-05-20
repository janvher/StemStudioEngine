import {useEffect, useState} from "react";
import {createPortal} from "react-dom";
import {Object3D, Object3DEventMap} from "three";

import {getAsset, getAssetRevision} from "@stem/network/api/asset";
import {DomainAssetDto, DomainAssetRevisionDto} from "@stem/network/api/client/api";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {AssetDependenciesList} from "../../common/AssetDependenciesList/AssetDependenciesList";
import {InfoCard} from "../../common/InfoCard/InfoCard";
import prefabIcon from "../../icons/assetsTab/prefabs/prefab-placeholder.svg";

export const DependenciesSection = () => {
    const app = global.app!;
    const editor = global.app!.editor!;
    const [stem, setStem] = useState<DomainAssetDto | null>(null);
    const {context: assetResolutionContext} = useAssetResolutionContext();
    const currentStemRevisionId = stem?.id ? resolveAssetRevisionId(stem?.id, assetResolutionContext) : null;
    const [versionModalState, setVersionModalState] = useState({stem: null as null | DomainAssetDto, isOpen: false});
    const [currentRevisionData, setCurrentRevisionData] = useState<DomainAssetRevisionDto>();
    const thumbnail = versionModalState.stem?.thumbnailUrl;

    useEffect(() => {
        const handleGetAsset = async () => {
            const stemId = (editor.selected as Object3D<Object3DEventMap>)?.userData.prefabId;
            if (!stemId) return;
            const asset = await getAsset(stemId, {includeThumbnails: true});
            setStem(asset);
        };

        void handleGetAsset();
        app.on("objectSelected.DependenciesSection", handleGetAsset);
        app.on("objectChanged.DependenciesSection", handleGetAsset);
        return () => {
            app.on("objectSelected.DependenciesSection", null);
            app.on("objectChanged.DependenciesSection", null);
        };
    }, []);

    useEffect(() => {
        if (!currentStemRevisionId || !stem?.id) return;
        const handleGetAssetRevision = async () => {
            const data = await getAssetRevision(stem.id, currentStemRevisionId, {includeDependencies: true});
            setCurrentRevisionData(data);
        };

        void handleGetAssetRevision();
    }, [currentStemRevisionId, stem]);

    return (
        <>
            {Object.entries(currentRevisionData?.dependencies ?? {}).map(([assetId, revisionId]) => 
                <AssetDependenciesList
                    key={assetId}
                    assetId={assetId}
                    revisionId={revisionId}
                    onClick={() => {
                        setVersionModalState({stem, isOpen: true});
                    }}
                />,
            )}
            {versionModalState.isOpen &&
                versionModalState.stem &&
                createPortal(
                    <InfoCard
                        isVersionPicker
                        isCardVisible={versionModalState.isOpen}
                        close={() => setVersionModalState({stem: null, isOpen: false})}
                        item={versionModalState.stem}
                        thumbnail={thumbnail || prefabIcon}
                        isDefaultThumbnail={!thumbnail}
                    />,
                    document.body,
                )}
        </>
    );
};
