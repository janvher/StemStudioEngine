import {useState} from "react";

import {AssetType} from "@stem/network/api/asset";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {showToast} from "@stem/editor-oss/showToast";
import type {AssetSource} from "../../../../../../../asset-management/AssetSource";
import {useCreateAssetWithData} from "../../../../../../../asset-management/hooks/assets";

export type LUTUploadSettings = {
    assetSource?: AssetSource;
};

export type LUTUploadResult = {
    assetId: string;
    revisionId: string;
    format: "cube" | "3dl";
    fileName: string;
};

/**
 * Hook for uploading a color-grading LUT file (`.cube` or `.3dl`) into
 * the asset system. Mirrors the VFX/Quarks uploader pattern so LUTs are
 * first-class, revisioned, shareable scene assets instead of ephemeral
 * local blob URLs.
 *
 * The uploaded asset is stored as a generic `AssetType.File` with the
 * LUT format recorded in the `format` field — callers (EffectRenderer)
 * use the format to pick the right loader (`LUTCubeLoader` vs
 * `LUT3dlLoader`). Content is uploaded as `application/octet-stream`
 * since neither format has a standard MIME type.
 */
export const useLUTUploader = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const createAssetWithData = useCreateAssetWithData();
    const {setAssetRevision} = useAssetResolutionContext();

    const uploadLUT = async (file: File, settings: LUTUploadSettings = {}): Promise<LUTUploadResult | null> => {
        setIsUploading(true);
        setError(null);

        try {
            const lower = file.name.toLowerCase();
            if (!lower.endsWith(".cube") && !lower.endsWith(".3dl")) {
                throw new Error("LUT must be a .cube or .3dl file");
            }
            const format: "cube" | "3dl" = lower.endsWith(".3dl") ? "3dl" : "cube";

            const arrayBuffer = await file.arrayBuffer();
            const blob = new Blob([arrayBuffer], {type: "application/octet-stream"});

            const asset = await createAssetWithData.mutateAsync({
                type: AssetType.File,
                name: file.name,
                data: blob,
                format,
                contentType: "application/octet-stream",
            });

            setAssetRevision(asset.id, asset.headRevisionId);

            showToast({type: "success", title: "LUT uploaded"});

            return {
                assetId: asset.id,
                revisionId: asset.headRevisionId,
                format,
                fileName: file.name,
            };
        } catch (err) {
            console.error("Error uploading LUT:", err);
            setError(err);
            showToast({
                type: "error",
                title: "Failed to upload LUT",
                body: err instanceof Error ? err.message : undefined,
            });
            return null;
        } finally {
            setIsUploading(false);
        }
    };

    return {isUploading, error, uploadLUT};
};
