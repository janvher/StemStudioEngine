import {useRef, useState} from "react";

import {AssetType} from "@stem/network/api/asset";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {showToast} from "@stem/editor-oss/showToast";
import {
    useCreateAssetRevisionWithData,
    useCreateAssetWithData,
} from "../../../../../../../asset-management/hooks/assets";

export type VFXUploadSettings = {
    updateAssetId?: string;
};

export const useVFXUploader = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<unknown>(null);

    const createAssetWithData = useCreateAssetWithData();
    const createAssetRevisionWithData = useCreateAssetRevisionWithData();

    const {context: assetResolutionContext, setAssetRevision} = useAssetResolutionContext();

    const assetResolutionContextRef = useRef(assetResolutionContext);
    assetResolutionContextRef.current = assetResolutionContext;

    const uploadVFX = async (name: string, data: unknown, settings: VFXUploadSettings) => {
        setIsUploading(true);
        setError(null);

        try {
            const json = JSON.stringify(data);

            /**
             * UPDATE EXISTING VFX
             */
            if (settings.updateAssetId) {
                if (!assetResolutionContextRef.current) {
                    throw new Error("No asset resolution context");
                }

                const parentRevisionId = resolveAssetRevisionId(
                    settings.updateAssetId,
                    assetResolutionContextRef.current,
                );

                if (!parentRevisionId) {
                    throw new Error("Failed to resolve parent revision ID");
                }

                const revision = await createAssetRevisionWithData.mutateAsync({
                    assetId: settings.updateAssetId,
                    parentRevisionId,
                    data: json,
                    format: "quarks",
                    contentType: "application/json",
                });

                setAssetRevision(revision.assetId, revision.id);

                showToast({type: "success", title: "VFX updated"});

                return {
                    assetId: revision.assetId,
                    revisionId: revision.id,
                };
            }

            /**
             * CREATE NEW VFX
             */
            const asset = await createAssetWithData.mutateAsync({
                type: AssetType.Quarks,
                name,
                data: json,
                format: "quarks",
                contentType: "application/json",
            });

            setAssetRevision(asset.id, asset.headRevisionId);

            showToast({type: "success", title: "VFX created"});

            return {
                assetId: asset.id,
                revisionId: asset.headRevisionId,
            };
        } catch (err) {
            console.error("Error uploading VFX:", err);
            setError(err);
            showToast({type: "error", title: "Failed to save VFX"});
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        isUploading,
        error,
        uploadVFX,
    };
};
