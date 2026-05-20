import {useEffect, useState} from "react";

import {DependencyCard, FlexWrapper, ImageContainer} from "./AssetDependenciesList.style";
import {getAsset} from "@stem/network/api/asset";
import {DomainAssetDto} from "@stem/network/api/client/api";
import {useAssetRevisions} from "../../../../asset-management/hooks/assets";
import {getAssetIcon} from "../../AssetsLibrary/services";
import {PublishInfo} from "../InfoCard/PublishInfo";
import {IDependencyUpdate} from "../InfoCard/StemVersionPicker/StemVersionPicker";
import {RevisionSelect} from "../RevisionSelect/RevisionSelect";

interface Props {
    assetId: string;
    revisionId: string;
    setDependenciesToUpdate?: React.Dispatch<React.SetStateAction<IDependencyUpdate[]>>;
    onClick?: (asset: DomainAssetDto) => void;
    dependenciesLocked?: boolean;
}

export const AssetDependenciesList = ({
    assetId,
    revisionId,
    setDependenciesToUpdate,
    onClick,
    dependenciesLocked,
}: Props) => {
    const {data: revisionsData} = useAssetRevisions(assetId, {
        includeRelease: true,
    });
    const [selectedRevisionId, setSelectedRevisionId] = useState<string>();
    const [asset, setAsset] = useState<DomainAssetDto>();

    useEffect(() => {
        const handleGetAsset = async () => {
            const asset = await getAsset(assetId, {includeThumbnails: true});
            setAsset(asset);
        };

        void handleGetAsset();
    }, [assetId]);

    const handleRevisionSelect = (newRevisionId: string) => {
        if (!setDependenciesToUpdate)
            return console.error("[handleRevisionSelect] setDependenciesToUpdate prop is not provided");
        if (!assetId) return console.error("[handleRevisionSelect] Asset id is undefined");

        if (revisionId !== newRevisionId) {
            setDependenciesToUpdate(prev => [
                ...prev.filter(el => el.assetId !== assetId),
                {selectedRevisionId: newRevisionId, assetId: assetId},
            ]);
        } else {
            setDependenciesToUpdate(prev => [...prev.filter(el => el.assetId !== assetId)]);
        }

        setSelectedRevisionId(newRevisionId);
    };

    if (!asset || !revisionsData) return;

    return (
        <DependencyCard onClick={() => onClick?.(asset)}>
            <FlexWrapper>
                <ImageContainer $defaultIcon={!asset.thumbnailUrl}>
                    <img src={getAssetIcon(asset)}
                        alt=""
                    />
                </ImageContainer>
                <PublishInfo asset={asset}
                    textXS
                    wrapperStyle={{flexShrink: 1, padding: "0 4px 0 0"}}
                    showName
                />
            </FlexWrapper>
            {!!setDependenciesToUpdate && 
                <RevisionSelect
                    assetId={assetId}
                    selectedRevisionId={selectedRevisionId}
                    onChange={handleRevisionSelect}
                    currentRevisionId={revisionId}
                    disabled={!!dependenciesLocked}
                />
            }
        </DependencyCard>
    );
};
