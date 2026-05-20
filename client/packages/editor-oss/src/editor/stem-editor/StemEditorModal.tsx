import {useCallback, useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";

import type {AssetType} from "@stem/network/api/asset";
import {useAsset} from "../asset-management/hooks/assets";
import {useEnsureEditableAsset} from "../assets/v2/common/hooks/useEnsureEditableAsset";
import {RemixBanner} from "../assets/v2/common/RemixBanner";

interface StemEditorModalProps {
    assetId: string;
    sceneId?: string;
    onClose: () => void;
    onStemSaved?: (assetId: string, revisionId: string) => void;
}

export const StemEditorModal = ({assetId, sceneId, onClose, onStemSaved}: StemEditorModalProps) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    // Track the asset id we should actually load. Starts as the prop value;
    // switches to the fork's id after a successful Remix so the iframe loads
    // the user's owned copy instead of the original.
    const [effectiveAssetId, setEffectiveAssetId] = useState(assetId);
    useEffect(() => {
        setEffectiveAssetId(assetId);
    }, [assetId]);

    // Fetch the asset so we know its owner + type for the permission gate.
    // Until this resolves, render a placeholder rather than the iframe so
    // we don't flash an editor for a non-owned asset.
    const {data: asset} = useAsset(effectiveAssetId);

    const {fork, canEdit, canFork} = useEnsureEditableAsset({
        assetId: effectiveAssetId,
        assetOwnerId: asset?.userId,
        assetType: (asset?.type ?? "scene"),
        revisionId: asset?.headRevisionId ?? "",
    });

    const [isRemixing, setIsRemixing] = useState(false);
    const handleRemix = useCallback(async () => {
        setIsRemixing(true);
        try {
            const editable = await fork();
            setEffectiveAssetId(editable.assetId);
        } catch (err) {
            console.error("[StemEditorModal] Remix failed:", err);
        } finally {
            setIsRemixing(false);
        }
    }, [fork]);

    const handleMessage = useCallback(
        (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;

            const data = event.data as {type?: string; assetId?: string; revisionId?: string} | undefined;
            if (data?.type === "stem-editor:saved" && data.assetId && data.revisionId) {
                onStemSaved?.(data.assetId, data.revisionId);
            }
            if (data?.type === "stem-editor:close") {
                onClose();
            }
        },
        [onClose, onStemSaved],
    );

    useEffect(() => {
        window.addEventListener("message", handleMessage);
        return () => {
            window.removeEventListener("message", handleMessage);
        };
    }, [handleMessage]);

    // Escape key closes the modal
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    // While the asset is still loading, hold off on deciding which surface
    // to render — the permission gate isn't trustworthy yet. Once it lands,
    // show the Remix gate when the user can fork but not edit; otherwise
    // load the iframe (covers the canEdit case AND the read-only case
    // where neither path applies — historical behavior left the iframe
    // open and let the inner UI surface its own restrictions).
    const showRemixGate = asset && !canEdit && canFork;
    const showIframe = asset && !showRemixGate;

    return ReactDOM.createPortal(
        <Overlay>
            <CloseButton onClick={onClose}>&times;</CloseButton>
            <IframeContainer>
                {showRemixGate && (
                    <RemixGate>
                        <RemixBanner
                            description="Read-only — this stem belongs to someone else. Remix to make your own copy and edit it."
                            onRemix={handleRemix}
                            isRemixing={isRemixing}
                        />
                    </RemixGate>
                )}
                {showIframe && (
                    <iframe
                        ref={iframeRef}
                        src={`/stem-editor/${effectiveAssetId}${sceneId ? `?sceneId=${encodeURIComponent(sceneId)}` : ""}`}
                        title="Stem Editor"
                    />
                )}
            </IframeContainer>
        </Overlay>,
        document.body,
    );
};

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    z-index: 99999999999999;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
`;

const IframeContainer = styled.div`
    width: 95vw;
    height: 95vh;
    border-radius: 8px;
    overflow: hidden;
    background: #1f2025;
    display: flex;
    flex-direction: column;

    iframe {
        width: 100%;
        height: 100%;
        border: none;
        flex: 1;
    }
`;

const RemixGate = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;

    > * {
        max-width: 720px;
        width: 100%;
        border-radius: 8px;
        border: 1px solid rgba(96, 165, 250, 0.4);
    }
`;

const CloseButton = styled.button`
    position: absolute;
    top: 12px;
    right: 16px;
    z-index: 1;
    background: rgba(0, 0, 0, 0.6);
    border: none;
    color: #fff;
    font-size: 24px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;
