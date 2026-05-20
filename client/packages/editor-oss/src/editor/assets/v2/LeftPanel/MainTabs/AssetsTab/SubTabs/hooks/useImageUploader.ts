import {useRef, useState} from "react";

import {AssetDerivativeType} from "@stem/network/api/asset";
import {resolveAssetRevisionId} from "@stem/editor-oss/asset-management/AssetResolutionContext";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {
    useCreateAssetDerivativeWithData,
    useCreateAssetRevisionWithData,
} from "../../../../../../../asset-management/hooks/assets";
import {useCreateImage} from "../../../../../../../images/hooks";
import {useCreateThumbnailDerivative} from "../../../../../../../models/hooks/models";

const createThumbnailFromImage = (file: File, maxWidth = 256, maxHeight = 256): Promise<File> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
            const canvas = document.createElement("canvas");
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Failed to get canvas context"));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(blob => {
                if (!blob) return reject(new Error("Failed to create thumbnail blob"));
                const thumbFile = new File([blob], "thumbnail.png", {type: "image/png"});
                resolve(thumbFile);
            }, "image/png");
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};

const getImageDimensions = (file: File): Promise<{width: number; height: number}> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({width: img.width, height: img.height});
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
};

export const useCreateImageDerivative = () => {
    const createAssetDerivativeWithData = useCreateAssetDerivativeWithData();

    return async (assetId: string, revisionId: string, file: File) => {
        const {width, height} = await getImageDimensions(file);
        const extension = file.name.split(".").pop()?.toLowerCase() || "";
        await createAssetDerivativeWithData.mutateAsync({
            assetId,
            revisionId,
            type: AssetDerivativeType.Image,
            format: extension,
            contentType: file.type,
            data: file,
            metadata: {width, height},
        });
    };
};

export type ImageUploadSettings = {
    updateAssetId?: string;
};

export const useImageUploader = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const abortControllerRef = useRef(new AbortController());

    const createImage = useCreateImage();
    const createAssetRevisionWithData = useCreateAssetRevisionWithData();
    const createThumbnailDerivative = useCreateThumbnailDerivative();
    const createImageDerivative = useCreateImageDerivative();
    const {context: assetResolutionContext, setAssetRevision} = useAssetResolutionContext();
    const assetResolutionContextRef = useRef(assetResolutionContext);
    assetResolutionContextRef.current = assetResolutionContext;

    const uploadImage = async (file: File, settings: ImageUploadSettings = {}) => {
        setIsUploading(true);
        setError(null);

        try {
            const thumbnailFile = await createThumbnailFromImage(file);

            if (settings.updateAssetId) {
                if (!assetResolutionContextRef.current) throw new Error("No asset resolution context");

                const parentRevisionId = resolveAssetRevisionId(settings.updateAssetId, assetResolutionContext);
                if (!parentRevisionId) {
                    throw new Error("Failed to resolve parent revision ID");
                }
                if (!parentRevisionId) throw new Error("Failed to resolve parent revision ID");

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

            const asset = await createImage({
                name: file.name,
                file,
            });

            global.app?.call("generatingThumbnail");
            await createThumbnailDerivative(asset.assetId, asset.revisionId, {
                file: thumbnailFile,
                width: 256,
                height: 256,
            });

            await createImageDerivative(asset.assetId, asset.revisionId, file);

            global.app?.call("generatingThumbnailDone");
            setAssetRevision(asset.assetId, asset.revisionId);

            showToast({type: "success", title: "Image uploaded!"});

            return {
                assetId: asset.assetId,
                revisionId: asset.revisionId,
            };
        } catch (err: any) {
            console.error("Error uploading image:", err);
            setError(err);
            let message = err?.response?.data?.message || err?.message || "Failed to upload image";
            if (typeof err?.response?.data === "string") {
                message = err.response.data;
            }
            showToast({type: "error", title: message});
            throw err;
        } finally {
            setIsUploading(false);
        }
    };

    const cancel = () => {
        abortControllerRef.current.abort();
    };

    return {
        isUploading,
        error,
        uploadImage,
        cancel,
    };
};
