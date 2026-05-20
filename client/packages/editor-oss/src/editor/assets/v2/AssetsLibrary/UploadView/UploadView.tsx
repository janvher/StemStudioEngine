import classNames from "classnames";
import {useEffect, useMemo, useRef, useState} from "react";
import {ClipLoader} from "react-spinners";
import styled from "styled-components";

import {OptionContainer, OptionTitle, StyledContainer, Top, Helper, StyledUploadButton} from "./UploadView.style";
import {SUPPORTED_MODEL_FORMATS} from "@stem/network/api/asset";
import type {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {useModelsTabContext} from "@stem/editor-oss/context";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {GenerateWithAIBox} from "../../common/GenerateWithAIBox/GenerateWithAIBox";
import {MissingTextureDialog} from "../../common/MissingTextureDialog";
import {StyledButton} from "../../common/StyledButton";
import useModelUploader from "../../LeftPanel/MainTabs/AssetsTab/ModelUpload/hooks/useModelUploader";
import {ModelPreview} from "../../LeftPanel/MainTabs/AssetsTab/ModelUpload/ModelPreview";
import {ModelPreviewSpinner} from "../../LeftPanel/MainTabs/AssetsTab/ModelUpload/ModelPreviewSpinner";
import {UploadSettings} from "../../LeftPanel/MainTabs/AssetsTab/ModelUpload/types";
import {useVFXUploader} from "../../LeftPanel/MainTabs/AssetsTab/SubTabs/hooks/useVFXUploader";
import arrow from "../images/arrow-left.svg";
import sketchIcon from "../images/sketch.svg";
import folderIcon from "../images/squares-plus.svg"; // Using same icon, could be replaced with folder icon
import x from "../images/x.svg";
import {AUDIO_SUPPORTED_FILETYPES, MODELS_SUPPORTED_FILETYPES, PARTICLE_EFFECT_SUPPORTED_FILETYPES} from "../types";

export type UploadViewProps = {
    uploadForScene: boolean;
    fileType: UPLOAD_FILE_TYPE;
    /** The ID of the asset that will be updated (i.e., with a new revision) */
    updateModelId?: string;
    onUploadComplete?: (assets: AssetRef[]) => void;
    closeView: () => void;
    closeUpload: () => void;
};

export enum UPLOAD_FILE_TYPE {
    MODEL = "model",
    AUDIO = "audio",
    PARTICLE_EFFECT = "particleEffect",
}

export const UploadView = ({
    closeView,
    closeUpload,
    onUploadComplete,
    uploadForScene,
    fileType,
    updateModelId,
}: UploadViewProps) => {
    const app = global.app;

    const {setEnabled} = useModelsTabContext();
    const {uploadVFX} = useVFXUploader();
    const particleEffectInputRef = useRef<HTMLInputElement>(null);

    // Single model upload
    const {
        modelFiles,
        modelData,
        isLoading,
        isUploading,
        setModelFiles,
        uploadModel,
        hasMoreModels,
        advanceToNextModel,
        reloadWithTextures,
    } = useModelUploader();
    const modelInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);

    const [loading, setLoading] = useState(false);
    const [texturePromptDismissed, setTexturePromptDismissed] = useState(false);

    // Reset texture prompt dismissal when new files are selected
    useEffect(() => {
        setTexturePromptDismissed(false);
    }, [modelFiles]);

    const modelFile = modelFiles instanceof FileList ? modelFiles[0] : (modelFiles ?? undefined);
    const modelUrl = useMemo(() => {
        return modelFile ? URL.createObjectURL(modelFile) : undefined;
    }, [modelFile]);

    useEffect(() => {
        return () => {
            if (modelUrl) URL.revokeObjectURL(modelUrl);
        };
    }, [modelUrl]);

    const getSupportedFiletypes = () => {
        if (fileType === UPLOAD_FILE_TYPE.AUDIO) {
            return AUDIO_SUPPORTED_FILETYPES;
        } else if (fileType === UPLOAD_FILE_TYPE.PARTICLE_EFFECT) {
            return PARTICLE_EFFECT_SUPPORTED_FILETYPES;
        }
        return MODELS_SUPPORTED_FILETYPES;
    };

    const supportedFiletypes = getSupportedFiletypes();

    const handleIndividualModelUpload = () => {
        if (modelInputRef.current) {
            // Reset the input value so that if the user selects the same file
            // it will still trigger the onChange event.
            modelInputRef.current.value = "";
            modelInputRef.current.click();
        }
    };

    const handleFolderUpload = () => {
        if (folderInputRef.current) {
            folderInputRef.current.value = "";
            folderInputRef.current.click();
        }
    };

    // Track uploaded assets when processing multiple models
    const uploadedAssetsRef = useRef<AssetRef[]>([]);

    // Reset uploaded assets when new files are selected
    useEffect(() => {
        if (modelFiles) {
            uploadedAssetsRef.current = [];
        }
    }, [modelFiles]);

    const handleIndividualModelUploadSave = (settings: UploadSettings) => {
        const assetSource = uploadForScene ? app?.editor?.assetSource : undefined;
        setEnabled(false);
        uploadModel({
            ...settings,
            assetSource,
            updateModelId,
        })
            .then(asset => {
                uploadedAssetsRef.current.push(asset);

                if (hasMoreModels) {
                    // More models to process, advance to next
                    void advanceToNextModel();
                    setEnabled(true);
                } else {
                    // All done, close and notify
                    setModelFiles(null);
                    onUploadComplete?.(uploadedAssetsRef.current);
                    uploadedAssetsRef.current = [];
                    setEnabled(true);
                }
            })
            .catch(error => {
                console.error(error);
                setEnabled(true);
            });
    };

    const handleIndividualModelUploadSkip = () => {
        if (hasMoreModels) {
            void advanceToNextModel();
        }
    };

    const handleInvidiualModelUploadCancel = () => {
        setModelFiles(null);
    };

    const handleParticleEffectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !app?.editor) return;

        const url = URL.createObjectURL(file);
        setLoading(true);

        try {
            const obj = await app?.editor?.loadQuarksFromJsonUrl(url);
            if (!obj) {
                showToast({type: "error", body: "Failed to load particle effect"});
                return;
            }
            await app.editor.addObject(obj);
            app.editor.select(obj);
            const serialized = app.editor.serializeObject(obj);
            await uploadVFX(obj.name || "Effect", serialized, {});
            app.call("finishedModelUpload", app.editor);
        } catch (error) {
            console.error("Error loading particle system:", error);
        } finally {
            e.target.value = ""; // Reset the input value to allow re-uploading the same file
            setLoading(false);
            closeView();
        }
    };

    // Track whether we're in multi-model flow to avoid closing on intermediate uploads
    const hasMoreModelsRef = useRef(hasMoreModels);
    useEffect(() => {
        hasMoreModelsRef.current = hasMoreModels;
    }, [hasMoreModels]);

    useEffect(() => {
        app?.on("finishedModelUpload.UploadView", () => {
            // Don't close if we're in multi-model flow and there are more models
            if (!hasMoreModelsRef.current) {
                closeUpload();
            }
            setLoading(false);
        });

        return () => {
            app?.on("finishedModelUpload.UploadView", null);
        };
    }, []);

    const uploadOptions = useMemo(() => {
        if (fileType === UPLOAD_FILE_TYPE.PARTICLE_EFFECT) {
            return [
                {
                    label: "Upload Quarks VFX JSON",
                    action: () => particleEffectInputRef.current?.click(),
                    icon: "",
                    hideSupportedFiletypes: true,
                },
                {
                    label: "Make from scratch",
                    action: () => app?.editor?.handleCreateParticleFromScratch(undefined, closeView),
                    icon: sketchIcon,
                    hideSupportedFiletypes: true,
                },
            ];
        } else if (fileType === UPLOAD_FILE_TYPE.MODEL) {
            return [
                {
                    label: "Upload",
                    action: handleIndividualModelUpload,
                    icon: "",
                    hideSupportedFiletypes: false,
                },
                {
                    label: "Folder Upload",
                    action: handleFolderUpload,
                    icon: folderIcon,
                    hideSupportedFiletypes: false,
                },
            ];
        }
        return [];
    }, [particleEffectInputRef, fileType, updateModelId, handleIndividualModelUpload, handleFolderUpload]);

    const header = useMemo(() => {
        if (fileType === UPLOAD_FILE_TYPE.AUDIO) {
            return "Audio";
        } else if (fileType === UPLOAD_FILE_TYPE.PARTICLE_EFFECT) {
            return "Particle Effects";
        }
        return "3D Models";
    }, [fileType]);

    return (
        <>
            <Container>
                <StyledContainer>
                    <Top>
                        <div className="name nameArrow">
                            <button className="reset-css"
                                onClick={closeUpload}
                            >
                                <img src={arrow}
                                    alt=""
                                />
                            </button>
                            Import or create 3D assets
                        </div>
                        <button className="reset-css"
                            onClick={closeView}
                        >
                            <img src={x}
                                alt="close"
                            />
                        </button>
                    </Top>
                    <div className="wrapper">
                        <OptionContainer>
                            <OptionTitle>{header}</OptionTitle>
                            {loading ? 
                                <ClipLoader loading
                                    size={40}
                                    color="#0284c7"
                                    aria-label="Loading Spinner"
                                />
                             : 
                                uploadOptions.map(({label, action, icon, hideSupportedFiletypes}) => 
                                    <StyledUploadButton
                                        className={classNames(
                                            "uploadButton",
                                            uploadOptions.length === 1 ? "single" : "",
                                        )}
                                        key={label}
                                    >
                                        <StyledButton
                                            addPlusIcon={!icon}
                                            isGrey
                                            width="auto"
                                            style={{padding: "8px 12px"}}
                                            onClick={() => {
                                                action();
                                            }}
                                        >
                                            {icon && <img src={icon} />}
                                            {label}
                                        </StyledButton>
                                        {!hideSupportedFiletypes && 
                                            <Helper className="helper">
                                                Supported filetypes: {supportedFiletypes}
                                            </Helper>
                                        }
                                    </StyledUploadButton>,
                                )
                            }
                        </OptionContainer>
                        {fileType === UPLOAD_FILE_TYPE.MODEL && 
                            <OptionContainer>
                                <OptionTitle>AI Generate</OptionTitle>
                                <GenerateWithAIBox
                                    addToProject={!!updateModelId}
                                    sceneID={app?.editor?.sceneID || ""}
                                    onGenerationStart={closeView}
                                />
                            </OptionContainer>
                        }
                    </div>
                </StyledContainer>
                {fileType === UPLOAD_FILE_TYPE.PARTICLE_EFFECT && 
                    <input
                        style={{display: "none"}}
                        ref={particleEffectInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleParticleEffectUpload}
                    />
                }
            </Container>

            {/** Single model upload preview */}
            <input
                type="file"
                ref={modelInputRef}
                style={{display: "none"}}
                accept={[...SUPPORTED_MODEL_FORMATS.map(format => `.${format}`), ".zip", "image/*"].join(",")}
                multiple
                onChange={e => setModelFiles(e.target.files)}
            />

            {/** Folder upload - uses webkitdirectory to select entire folder with nested structure */}
            <input
                type="file"
                ref={folderInputRef}
                style={{display: "none"}}
                // @ts-expect-error - webkitdirectory is a non-standard attribute for directory selection
                webkitdirectory=""
                multiple
                onChange={e => setModelFiles(e.target.files)}
            />
            {modelFiles && isLoading && <ModelPreviewSpinner onClose={handleInvidiualModelUploadCancel} />}
            {modelFiles && !isLoading && modelData && modelData.hasMissingTextures && !texturePromptDismissed && (
                <MissingTextureDialog
                    onSelectTextures={files => void reloadWithTextures(files)}
                    onContinue={() => setTexturePromptDismissed(true)}
                    onCancel={handleInvidiualModelUploadCancel}
                />
            )}
            {modelFiles && !isLoading && modelData && (!modelData.hasMissingTextures || texturePromptDismissed) &&
                <ModelPreview
                    model={modelData?.model}
                    format={modelData?.format}
                    isLoading={isUploading}
                    maxLodLevel={modelData?.maxLodLevel}
                    hasMoreModels={hasMoreModels}
                    onSave={handleIndividualModelUploadSave}
                    onSkip={hasMoreModels ? handleIndividualModelUploadSkip : undefined}
                    onCancel={handleInvidiualModelUploadCancel}
                />
            }
        </>
    );
};

const Container = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
`;
