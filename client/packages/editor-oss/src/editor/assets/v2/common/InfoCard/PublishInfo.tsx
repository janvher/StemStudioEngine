import {useEffect, useState} from "react";

import {FlexWrapper, PrimaryText, StyledPublishInfo} from "./Info.style";
import {AssetType} from "@stem/network/api/asset";
import {DomainAssetDto} from "@stem/network/api/client/api";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import {IEditorUser} from "../../../../../v2/pages/types";
import {getAssetIcon, getItemStatus, STATUS_MAP} from "../../AssetsLibrary/services";

interface Props {
    asset: DomainAssetDto;
    textXS?: boolean;
    wrapperStyle?: React.CSSProperties;
    showName?: boolean;
}

export const PublishInfo = ({asset, textXS, wrapperStyle, showName}: Props) => {
    const {dbUser, isCollaborator, getUser} = useAuthorizationContext();
    const [assetAuthor, setAssetAuthor] = useState<IEditorUser | undefined>();
    const status = getItemStatus(asset, dbUser, isCollaborator);
    const {icon, label} = STATUS_MAP[status];
    const dateStr = asset.latestRelease?.createTime || asset.updateTime || "";

    const formatted = new Date(dateStr)
        .toLocaleDateString("en-US", {
            month: "2-digit",
            day: "2-digit",
            year: "numeric",
        })
        .replaceAll("/", ".");

    useEffect(() => {
        const getOwner = async () => {
            const response = await getUser(asset.userId);
            if (response) {
                setAssetAuthor(response);
            }
        };
        void getOwner();
    }, []);

    return (
        <StyledPublishInfo style={wrapperStyle}>
            {showName && (
                <PrimaryText
                    $textXS={textXS}
                    style={{maxWidth: "190px", alignItems: "center"}}
                >
                    {asset.type !== AssetType.Model && asset.type !== AssetType.Image && (
                        <img
                            className="typeIcon"
                            style={{margin: "0 2px 0"}}
                            src={getAssetIcon(asset, true)}
                            alt=""
                        />
                    )}
                    <div className="text">{asset.name}</div>
                </PrimaryText>
            )}
            <FlexWrapper>
                <PrimaryText
                    $textXS={textXS}
                    style={{maxWidth: "190px", alignItems: "center"}}
                >
                    <img
                        className="textIcon"
                        style={{marginRight: "2px"}}
                        src={icon}
                        alt=""
                    />
                    <div className="text">{label}</div>
                </PrimaryText>
                <PrimaryText $textXS={textXS}>{formatted}</PrimaryText>
            </FlexWrapper>
            <PrimaryText $textXS={textXS}>
                By: {assetAuthor?.username || assetAuthor?.name || "Stem Studio Community"}
            </PrimaryText>
        </StyledPublishInfo>
    );
};
