import {useState, useRef} from "react";

import {AssetDerivativeType} from "@stem/network/api/asset";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import {showToast} from "@stem/editor-oss/showToast";
import {
    useCreateAssetDerivativeWithData,
    useCreateAssetRevisionWithData,
} from "../../../../../../../asset-management/hooks/assets";
import {useCreateAudio} from "../../../../../../../audio/hooks";

const getAudioMetadata = async (file: File): Promise<{duration: number; sampleRate: number; codec: string}> => {
    const duration = await new Promise<number>((resolve, reject) => {
        const audio = document.createElement("audio");
        audio.preload = "metadata";

        audio.onloadedmetadata = () => {
            URL.revokeObjectURL(audio.src);
            resolve(audio.duration);
        };

        audio.onerror = err => reject(err);
        audio.src = URL.createObjectURL(file);
    });

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;

    const audioContext = new AudioContextCtor();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const sampleRate = audioBuffer.sampleRate;
    await audioContext.close();

    const codec = file.type || file.name.split(".").pop()?.toLowerCase() || "unknown";

    return {
        duration,
        sampleRate,
        codec,
    };
};

export const useCreateAudioDerivative = () => {
    const createAssetDerivativeWithData = useCreateAssetDerivativeWithData();

    return async (assetId: string, revisionId: string, file: File) => {
        const {duration, sampleRate, codec} = await getAudioMetadata(file);

        const extension = file.name.split(".").pop()?.toLowerCase() || "";

        await createAssetDerivativeWithData.mutateAsync({
            assetId,
            revisionId,
            type: AssetDerivativeType.Audio,
            format: extension,
            contentType: file.type,
            data: file,
            metadata: {
                duration,
                sampleRate,
                codec,
            },
        });
    };
};

export type AudioUploadSettings = {
    updateAssetId?: string;
};

export const useAudioUploader = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const abortControllerRef = useRef(new AbortController());

    const createAudio = useCreateAudio();
    const createAssetRevisionWithData = useCreateAssetRevisionWithData();
    const createAudioDerivative = useCreateAudioDerivative();

    const {context: assetResolutionContext, setAssetRevision} = useAssetResolutionContext();
    const assetResolutionContextRef = useRef(assetResolutionContext);
    assetResolutionContextRef.current = assetResolutionContext;

    const uploadAudio = async (file: File, settings: AudioUploadSettings = {}) => {
        setIsUploading(true);
        setError(null);

        try {
            // UPDATE EXISTING ASSET
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
                    format: file.name.split(".").pop()?.toLowerCase() || "",
                    contentType: file.type,
                });

                await createAudioDerivative(revision.assetId, revision.id, file);

                setAssetRevision(revision.assetId, revision.id);

                return {
                    assetId: revision.assetId,
                    revisionId: revision.id,
                };
            }

            const asset = await createAudio({
                name: file.name,
                file,
            });

            await createAudioDerivative(asset.assetId, asset.revisionId, file);

            setAssetRevision(asset.assetId, asset.revisionId);

            showToast({type: "success", title: "Audio uploaded!"});

            return {
                assetId: asset.assetId,
                revisionId: asset.revisionId,
            };
        } catch (err) {
            console.error("Error uploading audio:", err);
            setError(err);
            showToast({type: "error", title: "Failed to upload audio"});
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
        uploadAudio,
        cancel,
    };
};
