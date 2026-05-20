import styled from "styled-components";

import {ButtonsContainer, Content, Heading, Popup} from "./AssetPublishConfirmationPopup.style";
import {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {useCreateAssetRelease, useUpdateAsset} from "../../../../editor/asset-management/hooks/assets";
import global from "@stem/editor-oss/global";
import i18n from "@stem/editor-oss/i18n/config";
import {showToast} from "@stem/editor-oss/showToast";
import {
    useAutoCreateAssetReleases,
    useGetUnreleasedAssetDependencies,
} from "../../../asset-management/hooks/dependencies";
import {useCreateThumbnailDerivative} from "../../../models/hooks/models";
import {getVersionString} from "../AssetsLibrary/services";
import {useEscapeDismiss} from "../common/hooks/useEscapeDismiss";
import {Overlay} from "../common/Overlay";
import {PanelImageSection} from "../common/PanelImageSection/PanelImageSection";
import {StyledButton} from "../common/StyledButton";
import {StyledTextarea} from "../common/StyledTextarea";
import closeIcon from "../icons/close-panel.svg";
import noImageIcon from "../icons/no-image.png";
import {THUMBNAIL_SIZE} from "../LeftPanel/MainTabs/AssetsTab/ModelUpload/constants";
import {Label, Property} from "../StemPublishPanel/StemPublishPanel.style";

export const AssetPublishConfirmationPopup = () => {
    const editor = global.app!.editor!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
    const editorState = editor.component?.state.assetPublishConfirmation!;
    const asset = editorState.asset;
    const thumbnail = asset?.thumbnailUrl;
    const newThumbnail = editorState.newThumbnailFile;
    const publishNotice = editorState.publishNotice;
    const newVersion = editorState.newVersion;
    const defaultIcon = editorState.assetDefaultIcon;
    const assetId = asset.id;

    const createThumbnailDerivative = useCreateThumbnailDerivative();
    const createAssetRelease = useCreateAssetRelease();
    const {context} = useAssetResolutionContext();
    const revisionId = resolveAssetRevisionId(assetId, context) || asset.headRevisionId;
    const autoCreateAssetReleases = useAutoCreateAssetReleases();
    const getUnreleasedAssetDependencies = useGetUnreleasedAssetDependencies();
    const updateAsset = useUpdateAsset();

    const createAssetReleaseObj = {
        assetId,
        revisionId,
        version: newVersion,
        description: asset.description,
    };

    const onPublished = () => {
        editor.component?.closeAssetPublishConfirmation();
    };
    useEscapeDismiss({onEscape: onPublished});

    const handleUpdateAsset = async () => {
        await updateAsset.mutateAsync({
            assetId,
            name: asset.name,
            description: asset.description,
            tags: asset.tags,
        });
        showToast({type: "success", title: i18n.t("Asset published")});
        onPublished();
    };

    const handlePublishDependenciesOk = (assetId: string, revisionId: string, unreleased: AssetRef[]) => {
        // Unreleased dependencies are ordered in a pre-order DFS traversal, so
        // we need to reverse it before publishing to ensure that dependencies
        // are published in the correct order.
        const reversedUnreleased = [...unreleased].reverse();
        autoCreateAssetReleases(reversedUnreleased)
            .then(() => {
                if (asset?.latestRelease?.revisionId !== revisionId) {
                    return createAssetRelease.mutateAsync(createAssetReleaseObj).then(() => {});
                }
            })
            .then(async () => {
                await handleUpdateAsset();
            })
            .catch(error => {
                console.error("Failed to create asset release", error);
                showToast({type: "error", title: i18n.t("Failed to publish asset")});
            });
    };

    const handlePublish = async () => {
        // Check if there are any unreleased dependencies
        getUnreleasedAssetDependencies(assetId, revisionId)
            .then(async unreleased => {
                if (unreleased.length > 0) {
                    handlePublishDependenciesOk(assetId, revisionId, unreleased);
                    return;
                }

                // When there is no new revision, just update the asset
                if (asset?.latestRelease?.revisionId === revisionId) {
                    await handleUpdateAsset();
                } else {
                    // Create the asset release
                    return createAssetRelease.mutateAsync(createAssetReleaseObj).then(async () => {
                        await handleUpdateAsset();
                    });
                }
            })
            .finally(async () => {
                if (newThumbnail) {
                    global.app?.call("generatingThumbnail");
                    const currentRevisionId = resolveAssetRevisionId(assetId, context) || asset.headRevisionId;
                    await createThumbnailDerivative(asset.id, currentRevisionId, {
                        file: newThumbnail,
                        width: THUMBNAIL_SIZE,
                        height: THUMBNAIL_SIZE,
                    });
                    global.app?.call("generatingThumbnailDone");
                }
            })
            .catch(error => {
                console.error("Failed to create asset release", error);
                showToast({type: "error", title: i18n.t("Failed to publish asset")});
            });
    };

    if (!asset) return;

    return (
        <Overlay>
            <Popup>
                <PanelImageSection
                    bgImg={newThumbnail ? URL.createObjectURL(newThumbnail) : thumbnail || defaultIcon || noImageIcon}
                    isDefaultIcon={!thumbnail}
                />
                <Content>
                    <Heading>
                        {asset.name}
                        {asset?.latestRelease && <div className="version">{getVersionString(asset.latestRelease)}</div>}
                        <CloseButton className="reset-css"
                            onClick={onPublished}
                        >
                            <img src={closeIcon}
                                alt={i18n.t("close")}
                            />
                        </CloseButton>
                    </Heading>
                    <Property style={{margin: "24px 0 8px"}}>
                        <Label>{i18n.t("Publish Notice")}</Label>
                        <StyledTextarea
                            value={""}
                            setValue={() => {}}
                            placeholder={publishNotice}
                            height="121px"
                            readOnly
                        />
                    </Property>
                    <ButtonsContainer>
                        <StyledButton isBlue
                            margin="auto 0 0 0"
                            onClick={handlePublish}
                        >
                            {i18n.t("Confirm Publish")}
                        </StyledButton>
                        <StyledButton
                            isGreySecondary
                            margin="auto 0 0 0"
                            onClick={() => editor.component?.closeAssetPublishConfirmation()}
                        >
                            {i18n.t("Do Not Publish")}
                        </StyledButton>
                    </ButtonsContainer>
                </Content>
            </Popup>
        </Overlay>
    );
};

const CloseButton = styled.button`
    margin-left: auto;

    img {
        width: 13px;
        height: auto;
    }
`;
