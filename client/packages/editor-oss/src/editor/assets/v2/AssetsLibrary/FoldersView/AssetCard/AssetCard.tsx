import {useEffect} from "react";

import {AssetName, StyledCard, DefaultImageWrapper, Bottom, SelectBox} from "./AssetCard.style";
import {AssetType} from "@stem/network/api/asset";
import {useAuthorizationContext, useLibrariesContext} from "@stem/editor-oss/context";
import {AssetStateType} from "@stem/editor-oss/context/LibrariesContext";
import {LibraryCardBottom} from "../../../common/StemCard/LibraryCardBottom";
import {StemCard} from "../../../common/StemCard/StemCard";
import defaultImg from "../../../icons/no-image.png";
import {getAssetIcon, isAssetWithThumbnail} from "../../services";

interface Props {
    asset: AssetStateType;
}

export const AssetCard = ({asset}: Props) => {
    const {setAssetsToAdd, assetsToAdd, allAssetsSelected, setAllAssetsSelected, currentAssets} = useLibrariesContext();
    const {isAdmin} = useAuthorizationContext();
    const selected = assetsToAdd.some(a => a.id === asset.id) || allAssetsSelected;

    const handleSelect = () => {
        if (selected && allAssetsSelected) {
            setAllAssetsSelected(false);
        }
        setAssetsToAdd(prev =>
            prev.some(a => a.id === asset.id) ? prev.filter(a => a.id !== asset.id) : [...prev, asset],
        );
    };

    useEffect(() => {
        if (allAssetsSelected) {
            setAssetsToAdd(currentAssets);
        } else if (assetsToAdd.length === currentAssets.length) {
            setAssetsToAdd([]);
        }
    }, [currentAssets, allAssetsSelected]);

    useEffect(() => {
        return () => {
            setAllAssetsSelected(false);
            setAssetsToAdd([]);
        };
    }, []);

    if (asset.type === AssetType.Prefab) return <StemCard key={asset.id}
        stem={asset}
        libraryView
                                                />;

    return (
        <StyledCard $selected={selected}
            $isHidden={isAdmin && asset.moderationStatus === "hidden"}
        >
            <DefaultImageWrapper>
                <SelectBox $selected={selected}
                    onClick={handleSelect}
                />
                <img
                    className={isAssetWithThumbnail(asset) ? "thumbnail" : "assetIcon"}
                    src={getAssetIcon(asset) || defaultImg}
                    alt=""
                    onError={e => {
                        e.currentTarget.src = defaultImg;
                    }}
                />
            </DefaultImageWrapper>
            <AssetName>
                <div className="text">{asset.name}</div>
            </AssetName>
            <Bottom>
                <LibraryCardBottom
                    asset={asset}
                    thumbnail={getAssetIcon(asset) || defaultImg}
                    defaultIcon={!isAssetWithThumbnail(asset)}
                />
            </Bottom>
        </StyledCard>
    );
};
