import {useState} from "react";

import {createTrackedShareUrl} from "@stem/network/api/rewards";
import {fetchRemixesOfScene} from "@stem/network/api/scene";
import {forkScene} from "@stem/network/api/scene/v2";
import type {GetSceneResponse} from "@stem/network/api/scene/v2";
import {ROUTES} from "@web-shared/routes";
import {IS_OSS} from "../../../mode/buildMode";
import {showToast} from "../../../showToast";
import {openEditorRoute} from "../editorHandoff";
import {generateProjectLink, getGameUrl} from "../links";
import {
    ActionButton,
    IconButton,
    LeftSide,
    Middle,
    Modal,
    ModalActions,
    ModalBackdrop,
    ModalHeader,
    ModalTitle,
    NavButton,
    RemixButton,
    RemixList,
    SceneNameWrapper,
    StyledNav,
} from "./PlayerTopNav.style";

interface PlayerTopNavProps {
    scene: GetSceneResponse | null;
    /** Database id of the viewer; null/empty for anonymous viewers. */
    viewerId: string | null | undefined;
}

type RemixPickerState = {
    remixes: RemixScene[];
    sceneName: string;
};

type RemixScene = {
    ID: string;
    Name?: string;
    UserID?: string;
};

export const PlayerTopNav = ({scene, viewerId}: PlayerTopNavProps) => {
    const [picker, setPicker] = useState<RemixPickerState | null>(null);
    const [forking, setForking] = useState(false);

    const sceneName = scene?.name ?? "";
    const sceneId = scene?.id ?? "";
    // OSS treats every local project as user-owned (no auth, no ownership
    // model). That makes the Edit affordance always available and disables
    // the cloud-only Remix flow.
    const isOwner = IS_OSS || (!!viewerId && !!scene && scene.userId === viewerId);
    const canEdit = !!scene && isOwner;
    const canRemix = !IS_OSS && !!scene && !isOwner && scene.isCloneable === true;
    const remixDisabled = !sceneId || forking;

    const handleBack = () => {
        window.location.href = ROUTES.DASHBOARD;
    };

    const startFork = async () => {
        if (!sceneId || forking) return;
        setForking(true);
        try {
            const result = await forkScene(sceneId);
            showToast({type: "success", title: "Starting a remix"});
            if (result?.newSceneId) {
                openEditorRoute(generateProjectLink(result.newSceneId));
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Remix failed.";
            showToast({type: "error", title: message});
        } finally {
            setForking(false);
        }
    };

    const handleRemixClick = async () => {
        if (!canRemix || remixDisabled) return;

        try {
            const result = await fetchRemixesOfScene(sceneId);
            const remixes = (result?.Scenes ?? []) as RemixScene[];
            const myRemixes = viewerId
                ? remixes.filter(remix => remix.UserID === viewerId)
                : [];
            if (myRemixes.length > 0) {
                setPicker({remixes: myRemixes, sceneName});
                return;
            }
        } catch {
            // Fall through to fork. Existing remixes are a convenience, not a gate.
        }

        void startFork();
    };

    const handleEditClick = () => {
        if (!sceneId) return;
        openEditorRoute(generateProjectLink(sceneId));
    };

    const handleSelectRemix = (remixSceneId: string) => {
        setPicker(null);
        openEditorRoute(generateProjectLink(remixSceneId));
    };

    const handleCreateNew = () => {
        setPicker(null);
        void startFork();
    };

    const handleShare = async () => {
        if (!sceneId) return;

        try {
            const baseUrl = getGameUrl(sceneId, scene?.alias || null) || window.location.href;
            const shareUrl = scene?.isPublished
                ? await createTrackedShareUrl(sceneId, baseUrl, {
                    creatorUserId: scene.userId,
                    channel: "player_top_bar",
                })
                : baseUrl;
            await navigator.clipboard.writeText(shareUrl);
            showToast({type: "success", title: "Share link copied"});
        } catch {
            showToast({type: "error", title: "Failed to copy share link"});
        }
    };

    const remixTitle = forking ? "Starting remix..." : "Remix this game";

    return (
        <>
            <StyledNav>
                <LeftSide>
                    <IconButton
                        type="button"
                        title="Back to dashboard"
                        aria-label="Back to dashboard"
                        onClick={handleBack}
                    >
                        <BackIcon />
                    </IconButton>
                    <SceneNameWrapper title={sceneName}>{sceneName}</SceneNameWrapper>
                </LeftSide>
                <Middle>
                    <NavButton $active title="You're playing this game">
                        Play
                    </NavButton>
                    <NavButton
                        disabled={!sceneId}
                        onClick={() => void handleShare()}
                        title="Copy share link"
                    >
                        Share
                    </NavButton>
                    {canEdit && (
                        <NavButton onClick={handleEditClick} title="Edit this game">
                            Edit
                        </NavButton>
                    )}
                    {!IS_OSS && canRemix && (
                        // OSS hides Remix: every project is local and
                        // directly editable, so the cloud-only "fork to
                        // own copy" affordance doesn't apply.
                        <NavButton
                            disabled={remixDisabled}
                            aria-disabled={remixDisabled}
                            onClick={() => void handleRemixClick()}
                            title={remixTitle}
                            style={{
                                opacity: forking ? 0.65 : 1,
                                cursor: forking ? "wait" : "pointer",
                            }}
                        >
                            Remix
                        </NavButton>
                    )}
                </Middle>
            </StyledNav>
            {picker && (
                <ModalBackdrop>
                    <Modal role="dialog" aria-modal="true" aria-labelledby="player-remix-title">
                        <ModalHeader>
                            <ModalTitle id="player-remix-title">Your remixes of {picker.sceneName}</ModalTitle>
                        </ModalHeader>
                        <RemixList>
                            {picker.remixes.map(remix => (
                                <RemixButton
                                    key={remix.ID}
                                    type="button"
                                    onClick={() => handleSelectRemix(remix.ID)}
                                >
                                    {remix.Name || "Untitled remix"}
                                </RemixButton>
                            ))}
                        </RemixList>
                        <ModalActions>
                            <ActionButton type="button" onClick={() => setPicker(null)}>
                                Cancel
                            </ActionButton>
                            <ActionButton type="button" $primary onClick={handleCreateNew}>
                                New remix
                            </ActionButton>
                        </ModalActions>
                    </Modal>
                </ModalBackdrop>
            )}
        </>
    );
};

const BackIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
            d="M15 18l-6-6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

