/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {marked} from "marked";
import {CSSProperties, RefObject, useEffect, useMemo, useRef, useState} from "react";
import {useOnClickOutside} from "usehooks-ts";

import {
    CloseButton,
    Content,
    Description,
    FlexWrapper,
    LinksInfo,
    MainInfo,
    PrimaryText,
    StyledCard,
} from "./Info.style";
import {PublishInfo} from "./PublishInfo";
import {StemVersionPicker} from "./StemVersionPicker/StemVersionPicker";
import {AssetType} from "@stem/network/api/asset";
import {DomainAssetDto} from "@stem/network/api/client/api";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import {AssetStateType} from "@stem/editor-oss/context/LibrariesContext";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {useGetAssetRevision, useUpdateAsset} from "../../../../asset-management/hooks/assets";
import {getVersionString} from "../../AssetsLibrary/services";
import stemIcon from "../../icons/stem-icon.svg";
import xIcon from "../../icons/x-mark.svg";
import {FileData} from "../../types/file";
import {PanelImageSection} from "../PanelImageSection/PanelImageSection";
import {StyledButton} from "../StyledButton";
import {TagsList} from "../Tags/TagsList/TagsList";
import {Tooltip} from "../Tooltip";

// Needed to unify scene keys with new api asset keys
const normalizeItem: (item: any) => Partial<DomainAssetDto> = item => {
    return {
        ...item,
        name: item.name ?? item.Name,
        description: item.description ?? item.Description,
        tags: item.tags ?? (item.Tags ? JSON.parse(item.Tags) : []),
        latestRelease: item.latestRelease || null,
        updateTime: item.updateTime ?? item.UpdateTime,
        id: item.id ?? item.ID,
        type: item.type ?? "scene",
        userId: item.userId ?? item.UserID,
        format: item.format ?? undefined,
        links: item.links ?? undefined,
    };
};

export interface Props {
    thumbnail: string;
    item: AssetStateType | FileData;
    isDefaultThumbnail?: boolean;
    assetsCount?: string;
    isCardVisible: boolean;
    close: () => void;
    inLibrary?: boolean;
    isVersionPicker?: boolean;
    style?: CSSProperties;
}

export const InfoCard = ({
    thumbnail,
    isDefaultThumbnail,
    assetsCount,
    item,
    isCardVisible,
    close,
    inLibrary,
    isVersionPicker,
    style,
}: Props) => {
    const [normalizedItem, setNormalizedItem] = useState(normalizeItem(item));
    const cardRef = useRef<HTMLDivElement | null>(null);
    const fileType = normalizedItem.format !== "json" ? normalizedItem.format?.toUpperCase() : undefined;
    const {isAdmin} = useAuthorizationContext();
    const updateAssetMutation = useUpdateAsset();
    const isHidden = normalizedItem.moderationStatus === "hidden";
    const getAssetRevision = useGetAssetRevision();
    const [avatarType, setAvatarType] = useState<null | string>(null);

    useEffect(() => {
        const handleGetAssetRevision = async () => {
            if ("id" in item) {
                const data = await getAssetRevision(item.id, item.headRevisionId, {includeMetadata: true});
                if (data.metadata?.avatarType) {
                    setAvatarType(data.metadata.avatarType as string);
                }
            }
        };

        void handleGetAssetRevision();
    }, []);

    const handleToggleModeration = async () => {
        const newStatus = isHidden ? "" : "hidden";
        try {
            await updateAssetMutation.mutateAsync({
                assetId: normalizedItem.id!,
                moderationStatus: newStatus,
            });
            showToast({type: "success", title: isHidden ? "Asset unhidden." : "Asset hidden from library."});
            setNormalizedItem(prev => ({...prev, moderationStatus: newStatus}));
            global.app?.call("objectChanged");
        } catch (err) {
            console.error("[InfoCard] Failed to update moderation status:", err);
            showToast({type: "error", title: "Failed to update moderation status."});
        }
    };

    useOnClickOutside(cardRef as RefObject<HTMLDivElement>, () => {
        close();
    });

    const getDefaultDescription = () => {
        switch (normalizedItem.type) {
            case AssetType.Audio:
                return "Sounds can be used in behaviors, point sounds, and in ui.";

            case AssetType.Image:
                return "Textures can be used in places like the material editor, billboards, behaviors and more.";

            case AssetType.Model:
                return "3D modes can be used in game scenes and in stems.";

            default:
                return "No description yet.";
        }
    };

    const canHaveLinks = normalizedItem.type === AssetType.Behavior || normalizedItem.type === AssetType.Prefab;
    const defaultDescription = getDefaultDescription();
    const descriptionHtml = useMemo(() => {
        const description = normalizedItem.description || defaultDescription;
        const normalizedDescription = description.replace(/\r\n/g, "\n").replace(/\\n/g, "\n");
        return marked.parse(normalizedDescription, {gfm: true, breaks: true}) as string;
    }, [defaultDescription, normalizedItem.description]);

    if (!isCardVisible) {
        return null;
    }

    return (
        <StyledCard
            ref={cardRef}
            className="infoCard"
            $inLibrary={!!inLibrary}
            style={style}
        >
            <PanelImageSection
                bgImg={thumbnail}
                isDefaultIcon={!!isDefaultThumbnail}
            >
                <CloseButton
                    className="reset-css"
                    onClick={e => {
                        e.stopPropagation();
                        close();
                    }}
                >
                    <img
                        src={xIcon}
                        alt="close"
                        className="xIcon"
                    />
                </CloseButton>
            </PanelImageSection>

            <Content className="hidden-scroll">
                <MainInfo>
                    <FlexWrapper>
                        <PrimaryText style={{maxWidth: "190px"}}>
                            {normalizedItem.type === AssetType.Prefab && (
                                <img
                                    className="textIcon"
                                    src={stemIcon}
                                    alt=""
                                />
                            )}
                            <div className="text">{normalizedItem.name}</div>
                        </PrimaryText>
                        <PrimaryText>
                            {assetsCount || fileType || getVersionString(normalizedItem.latestRelease)}
                        </PrimaryText>
                    </FlexWrapper>
                    {avatarType && (
                        <FlexWrapper>
                            <PrimaryText style={{maxWidth: "190px"}}>
                                <div className="text">Avatar Type</div>
                            </PrimaryText>
                            <PrimaryText>{avatarType}</PrimaryText>
                        </FlexWrapper>
                    )}
                    {!isVersionPicker && (
                        <>
                            {(normalizedItem.tags || []).length > 0 ? (
                                <TagsList
                                    stemTags={normalizedItem.tags || []}
                                    readOnly
                                />
                            ) : (
                                <PrimaryText>No tags</PrimaryText>
                            )}
                        </>
                    )}
                </MainInfo>

                <PublishInfo asset={normalizedItem as DomainAssetDto} />

                {isAdmin && (
                    <div style={{padding: "4px 16px"}}>
                        <Tooltip
                            text={
                                isHidden
                                    ? "Make this asset visible in the library again"
                                    : "Hide this asset from library listings"
                            }
                            triggerFullWidth
                        >
                            <StyledButton
                                className="commonButton"
                                width="100%"
                                style={{height: "24px", fontSize: "11px", cursor: "pointer"}}
                                isGreySecondary
                                onClick={handleToggleModeration}
                            >
                                {isHidden ? "Unhide" : "Hide"}
                            </StyledButton>
                        </Tooltip>
                    </div>
                )}

                {canHaveLinks && (
                    <LinksInfo>
                        <FlexWrapper>
                            <PrimaryText style={{maxWidth: "190px"}}>
                                <div className="text">Links</div>
                            </PrimaryText>
                            {/* {links.length > 0 ? (
                        links.map(link => (
                            <LinkButton href={link.url}><img src={link.format ===} alt="" /></LinkButton>
                        ))
                    ) : (
                        <PrimaryText>No links</PrimaryText>
                        )} */}
                            <PrimaryText>No links</PrimaryText>
                        </FlexWrapper>
                    </LinksInfo>
                )}

                <Description className="hidden-scroll">
                    <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
                </Description>
                {isVersionPicker && <StemVersionPicker stem={item as AssetStateType} />}
            </Content>
        </StyledCard>
    );
};
