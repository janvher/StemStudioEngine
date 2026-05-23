import {QueryClientProvider} from "@tanstack/react-query";
import React, {useState, useEffect} from "react";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {AssetType, createAssetWithData} from "@stem/network/api/asset";
import {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {SceneAssetResolutionProvider} from "@stem/editor-oss/context/SceneAssetResolutionContext";
import {queryClient} from "@web-shared/queryClient";
import {showToast} from "@stem/editor-oss/showToast";
import {StyledButton} from "../../assets/v2/common/StyledButton";
import {selectFile} from "../../assets/v2/LeftPanel/MainTabs/AssetsTab/AssetsRows/helpers";
import {useAudioUploader} from "../../assets/v2/LeftPanel/MainTabs/AssetsTab/SubTabs/hooks/useAudioUploader";
import {useImageUploader} from "../../assets/v2/LeftPanel/MainTabs/AssetsTab/SubTabs/hooks/useImageUploader";
import {useVideoUploader} from "../../assets/v2/LeftPanel/MainTabs/AssetsTab/SubTabs/hooks/useVideoUploader";
import {SelectRow} from "../../assets/v2/RightPanel/common/SelectRow";
import {AssetAttribute} from "../BehaviorAttributes";

type AssetOption = {
    key: string;
    value: string;
    assetRef: AssetRef | null;
};

const noneOption = {key: "none", value: "none", assetRef: null} as const;

export type UploadButtonProps = {onUploaded: (assetRef: AssetRef) => void};

const AssetWidgetComponent: React.FC<{
    label: string;
    optionsPromise: Promise<{name: string; assetRef: AssetRef}[]>;
    getCurrentValue: () => AssetRef | null;
    updateBehaviorField: (assetRef: AssetRef | null) => void;
    UploadButton?: React.FC<UploadButtonProps>;
}> = ({label, optionsPromise, getCurrentValue, updateBehaviorField, UploadButton}) => {
    const [options, setOptions] = useState<AssetOption[]>([noneOption]);
    const [current, setCurrent] = useState(getCurrentValue());

    useEffect(() => {
        optionsPromise
            .then(newOptions => {
                const mapped = newOptions.map(option => ({
                    key: option.assetRef.assetId,
                    value: option.name,
                    assetRef: option.assetRef,
                }));
                setOptions([noneOption, ...mapped]);
            })
            .catch(() => setOptions([noneOption]));
    }, [optionsPromise]);

    useEffect(() => {
        setCurrent(getCurrentValue());
    }, [getCurrentValue]);

    const selectedOption = options.find(
        option => option.assetRef?.assetId === current?.assetId && option.assetRef?.revisionId === current?.revisionId,
    );

    const handleChange = (item: any) => {
        setCurrent(item.assetRef);
        updateBehaviorField(item.assetRef);
    };

    const handleUploaded = (assetRef: AssetRef) => {
        handleChange({assetRef});
    };

    return (
        <>
            <SelectRow
                label={label}
                value={selectedOption}
                data={options}
                onChange={handleChange}
                $margin="0"
                width={!label ? "100%" : undefined}
            />
            {UploadButton && <UploadButton onUploaded={handleUploaded} />}
        </>
    );
};

export const ImageUploadButton: React.FC<UploadButtonProps> = ({onUploaded}) => {
    const {uploadImage} = useImageUploader();
    return (
        <StyledButton
            onClick={() => {
                selectFile({
                    accept: ".jpeg,.jpg,.png,.ktx2",
                    onFileSelected: async (file: File) => {
                        const assetRef = await uploadImage(file);
                        onUploaded(assetRef);
                    },
                });
            }}
            isBlue
            width="120px"
            height="24px"
            margin="16px 0 16px auto"
        >
            Upload image
        </StyledButton>
    );
};

export const AudioUploadButton: React.FC<UploadButtonProps> = ({onUploaded}) => {
    const {uploadAudio} = useAudioUploader();
    return (
        <StyledButton
            onClick={() => {
                selectFile({
                    accept: ".mp3,.wav,.ogg,.aac,.m4a,.flac",
                    onFileSelected: async (file: File) => {
                        const assetRef = await uploadAudio(file);
                        onUploaded(assetRef);
                    },
                });
            }}
            isBlue
            width="120px"
            height="24px"
            margin="16px 0 16px auto"
        >
            Upload audio
        </StyledButton>
    );
};

export const VideoUploadButton: React.FC<UploadButtonProps> = ({onUploaded}) => {
    const {uploadVideo} = useVideoUploader();
    return (
        <StyledButton
            onClick={() => {
                selectFile({
                    accept: ".mp4,.webm,.mov",
                    onFileSelected: async (file: File) => {
                        const assetRef = await uploadVideo(file);
                        // `uploadVideo` returns null when the upload was
                        // refused (e.g. playground mode shows a toast and
                        // bails). Skip the callback so AssetRefs stay valid.
                        if (assetRef) onUploaded(assetRef);
                    },
                });
            }}
            isBlue
            width="120px"
            height="24px"
            margin="16px 0 16px auto"
        >
            Upload video
        </StyledButton>
    );
};

export const FileUploadButton: React.FC<UploadButtonProps> = ({onUploaded}) => {
    return (
        <StyledButton
            onClick={() => {
                selectFile({
                    accept: "*/*",
                    onFileSelected: async (file: File) => {
                        try {
                            const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
                            const contentType = file.type || "application/octet-stream";
                            const asset = await createAssetWithData({
                                type: AssetType.File,
                                name: file.name,
                                data: file,
                                format: extension,
                                contentType,
                            });
                            onUploaded({assetId: asset.id, revisionId: asset.headRevisionId});
                            showToast({type: "success", title: "File uploaded!"});
                        } catch (err) {
                            console.error("Error uploading file:", err);
                            showToast({type: "error", title: "Failed to upload file"});
                        }
                    },
                });
            }}
            isBlue
            width="120px"
            height="24px"
            margin="16px 0 16px auto"
        >
            Upload file
        </StyledButton>
    );
};

class AssetWidget extends BaseAttributeWidget {
    constructor(
        private readonly prefix: string,
        private readonly UploadButton?: React.FC<UploadButtonProps>,
    ) {
        super();
    }

    protected getContainerPrefix(): string {
        return this.prefix;
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: AssetAttribute,
        getCurrentValue: () => AssetRef | null,
        updateBehaviorField: (assetRef: AssetRef | null) => void,
    ): React.ReactElement {
        return (
            <QueryClientProvider client={queryClient}>
                <SceneAssetResolutionProvider>
                    <AssetWidgetComponent
                        label={name}
                        optionsPromise={attribute.optionsPromise}
                        getCurrentValue={getCurrentValue}
                        updateBehaviorField={updateBehaviorField}
                        UploadButton={this.UploadButton}
                    />
                </SceneAssetResolutionProvider>
            </QueryClientProvider>
        );
    }
}

export default AssetWidget;
