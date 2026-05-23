import {useState, useRef} from "react";

import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {showToast} from "@stem/editor-oss/showToast";
import {isPlaygroundMode} from "@web-shared/playgroundMode";
import {
    useCreateAssetRevisionWithData,
} from "../../../../../../../asset-management/hooks/assets";
import {useCreateVideo} from "../../../../../../../video/hooks";

export type VideoUploadSettings = {
    updateAssetId?: string;
};

export const useVideoUploader = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const createAssetRevisionWithData = useCreateAssetRevisionWithData();
    const createVideo = useCreateVideo();

    const {context: assetResolutionContext, setAssetRevision} = useAssetResolutionContext();

    const assetResolutionContextRef = useRef(assetResolutionContext);
    assetResolutionContextRef.current = assetResolutionContext;

    const uploadVideo = async (file: File, settings: VideoUploadSettings = {}) => {
        // Playground builds don't ship a video transcode/storage pipeline —
        // the upload would silently fail at the network adapter. Surface a
        // clear toast instead of letting the user wait for a generic error.
        if (isPlaygroundMode()) {
            showToast({
                type: "info",
                title: "Video uploads are not supported in the playground.",
                body: "Try the full StemStudio build to upload and use video assets.",
            });
            return null;
        }

        setIsUploading(true);
        setError(null);

        try {
            if (settings.updateAssetId) {
                if (!assetResolutionContextRef.current) {
                    throw new Error("No asset resolution context");
                }

                const parentRevisionId =
                    assetResolutionContextRef.current.assetIdToRevisionId?.[settings.updateAssetId];

                if (!parentRevisionId) {
                    throw new Error("Failed to resolve parent revision ID");
                }

                const revision = await createAssetRevisionWithData.mutateAsync({
                    assetId: settings.updateAssetId,
                    parentRevisionId,
                    data: file,
                    contentType: file.type,
                    format: "",
                });

                setAssetRevision(revision.assetId, revision.id);

                return {
                    assetId: revision.assetId,
                    revisionId: revision.id,
                };
            }

            const asset = await createVideo({
                name: file.name,
                file,
            });

            setAssetRevision(asset.assetId, asset.revisionId);

            showToast({type: "success", title: "Video uploaded!"});

            return {
                assetId: asset.assetId,
                revisionId: asset.revisionId,
            };
        } catch (err) {
            console.error("Error uploading video:", err);
            setError(err);
            showToast({type: "error", title: "Failed to upload video"});
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        isUploading,
        error,
        uploadVideo,
    };
};
