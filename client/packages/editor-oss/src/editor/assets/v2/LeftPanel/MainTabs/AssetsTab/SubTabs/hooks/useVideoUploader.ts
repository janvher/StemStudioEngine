import {useState, useRef} from "react";

import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {showToast} from "@stem/editor-oss/showToast";
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
