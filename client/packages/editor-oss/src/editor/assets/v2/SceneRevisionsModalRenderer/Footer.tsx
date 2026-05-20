import {useState} from "react";

import {ModalFooter} from "./SceneRevisionsModal.style";
import {useAppGlobalContext, useHomepageContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import i18n from "@stem/editor-oss/i18n/config";
import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {generateProjectLink} from "../../../../v2/pages/links";
import {usePublishScene, useUnpublishScene} from "../../../asset-management/hooks/publish";
import {StyledButton} from "../common/StyledButton";
import editIcon from "../CreateDashboard/icons/edit.svg";
import publishedStatusIcon from "../CreateDashboard/icons/published-status.svg";
import unpublishedStatusIcon from "../CreateDashboard/icons/unpublished-status.svg";
import closeIcon from "../icons/close-panel.svg";
import {FileData} from "../types/file";

export const Footer = ({
    selectedRevisionId,
    headRevisionId,
    assetId,
}: {
    selectedRevisionId: string;
    headRevisionId: string;
    assetId: string;
}) => {
    const [loading, setLoading] = useState(false);
    const {
        sceneRevisionModalSceneData,
        updatePublishedRevisionIDInHistoryModal,
        closeSceneHistoryModal,
        setIsEditingOldRevision,
    } = useAppGlobalContext();
    const {setShouldRefreshDashboard} = useHomepageContext();
    const publishMutation = usePublishScene();
    const unpublishMutation = useUnpublishScene();
    const published = selectedRevisionId === sceneRevisionModalSceneData?.scene.publishRevisionId;
    const isDashboardScene = Boolean(sceneRevisionModalSceneData && "ID" in sceneRevisionModalSceneData.scene);

    const managePublishing = async () => {
        setLoading(true);
        if (!sceneRevisionModalSceneData) {
            setLoading(false);
            return;
        }
        const scene = sceneRevisionModalSceneData.scene;
        const sceneID = "ID" in scene ? scene.ID : scene.sceneID;
        if (!sceneID) {
            setLoading(false);
            return;
        }
        try {
            const result = published
                ? await unpublishMutation.mutateAsync({sceneId: sceneID, sceneAssetId: assetId})
                : await publishMutation.mutateAsync({sceneId: sceneID, revisionId: selectedRevisionId, sceneAssetId: assetId});
            // Keep the modal's local scene copy in sync so the Live column
            // re-renders immediately. Cache invalidation + event broadcast
            // are handled by the mutation's `onSuccess`.
            updatePublishedRevisionIDInHistoryModal(result.publishRevisionId ?? "");
            setShouldRefreshDashboard(true);
        } catch {
            showToast({type: "error", title: `Failed to ${published ? "unpublish" : "publish"} revision.`});
        } finally {
            setLoading(false);
        }
    };

    const handleEditSceneRevision = async () => {
        if (!sceneRevisionModalSceneData) return;

        if (isDashboardScene) {
            const scene = sceneRevisionModalSceneData.scene as FileData;
            const nextUrl = new URL(generateProjectLink(scene.ID), window.location.origin);

            if (selectedRevisionId) {
                nextUrl.searchParams.set("revisionId", selectedRevisionId);
            }
            if (headRevisionId) {
                nextUrl.searchParams.set("headRevisionId", headRevisionId);
            }

            closeSceneHistoryModal();
            setIsEditingOldRevision(selectedRevisionId !== headRevisionId);
            window.location.assign(`${nextUrl.pathname}${nextUrl.search}`);
            return;
        }

        const app = global.app;
        const editor = app?.editor;
        if (!app || !editor?.sceneID) return;

        const confirmed = await new Promise<boolean>(resolve => {
            ElementsUtils.confirm({
                title: i18n.t("Load older revision?"),
                content: i18n.t("The current scene will be replaced. Any unsaved changes will be lost."),
                okText: i18n.t("Load revision"),
                cancelText: i18n.t("Cancel"),
                onOK: () => resolve(true),
                onCancel: () => resolve(false),
                onClose: () => resolve(false),
            });
        });
        if (!confirmed) return;

        setLoading(true);
        try {
            closeSceneHistoryModal();
            await app.setUpScene(editor.sceneID, {revisionId: selectedRevisionId});
            setIsEditingOldRevision(selectedRevisionId !== headRevisionId);
            showToast({title: i18n.t("Revision loaded"), type: "success"});
        } catch (e: unknown) {
            console.error("Error while loading the project:", e);
            showToast({type: "error", title: i18n.t("Failed to load project scene.")});
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalFooter>
            <StyledButton
                isSecondaryDialogBtn
                customIcon={closeIcon}
                width="140px"
                disabled={loading}
                onClick={closeSceneHistoryModal}
            >
                Close
            </StyledButton>
            <StyledButton
                isPurpleDialogBtn
                customIcon={published ? publishedStatusIcon : unpublishedStatusIcon}
                width="200px"
                disabled={!selectedRevisionId || loading}
                onClick={managePublishing}
            >
                {published ? "Unpublish" : "Publish"} this Version
            </StyledButton>
            <StyledButton
                isMainDialogBtn
                customIcon={editIcon}
                width="322px"
                disabled={
                    loading
                    || !selectedRevisionId
                    || (!isDashboardScene && selectedRevisionId === global.app?.editor?.sceneRevisionId)
                }
                onClick={() => void handleEditSceneRevision()}
            >
                Edit this Version
            </StyledButton>
        </ModalFooter>
    );
};
