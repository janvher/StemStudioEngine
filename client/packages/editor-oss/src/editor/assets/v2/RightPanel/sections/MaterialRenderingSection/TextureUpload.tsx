import {useEffect, useMemo, useRef, useState} from "react";
import * as THREE from "three";
import {useOnClickOutside} from "usehooks-ts";

import {
    DeleteButton,
    Preview,
    PreviewActionButton,
    PreviewActions,
    TextureLabel,
    TexturePickerEmpty,
    TexturePickerFilterButton,
    TexturePickerFilters,
    TexturePickerGrid,
    TexturePickerItem,
    TexturePickerPopup,
    TextureWrapper,
    UploadView,
} from "./MaterialRenderingSection.style";
import {IMaterialSettings, IMaterialSettingsTextures} from "./types";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {useAssetImageDerivative} from "../../../../../asset-management/hooks/assets";
import {parseMaterialAssetIdWithRevision} from "../../../../../images/hooks";
import deleteIcon from "../../../icons/delete-icon-new.svg";
import uploadIcon from "../../../icons/upload-icon.svg";
import {useImageUploader} from "../../../LeftPanel/MainTabs/AssetsTab/SubTabs/hooks/useImageUploader";
import arrowDownIcon from "../../icons/arrow-down.svg";

interface Props {
    materialSettings: IMaterialSettings;
    setMaterialSettings: React.Dispatch<React.SetStateAction<IMaterialSettings>>;
    textureKey: keyof IMaterialSettingsTextures;
    label: string;
    saveMaterialSettingsToUserData: (selected: THREE.Object3D, settings: IMaterialSettings) => void;
    selectedTexture?: keyof IMaterialSettingsTextures;
    handleSelectTexture: () => void;
}

const SUPPORTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
type TexturePickerFilter = "all" | "inUse" | "currentMaterial";
const MATERIAL_TEXTURE_KEYS: (keyof IMaterialSettingsTextures)[] = [
    "base",
    "ambient",
    "specular",
    "metallic",
    "roughness",
    "normal",
    "emissive",
    "orm",
];

const isAssetId = (value: string): boolean =>
    /^([a-f0-9]{24}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(value);

const getValidAssetId = (value: unknown): string | null => {
    if (typeof value !== "string" || !value || value.includes("__deleted__")) return null;
    const assetId = parseMaterialAssetIdWithRevision(value)?.assetId;
    return assetId && isAssetId(assetId) ? assetId : null;
};

const collectTextureIdsFromMaterialSettings = (settings: unknown, textureIds: Set<string>) => {
    if (!settings || typeof settings !== "object") return;

    const asRecord = settings as Record<string, unknown>;
    const isSingleSettings = "textures" in asRecord && typeof asRecord.textures === "object";

    if (isSingleSettings) {
        const textures = asRecord.textures as Partial<Record<keyof IMaterialSettingsTextures, unknown>>;
        MATERIAL_TEXTURE_KEYS.forEach(key => {
            const assetId = getValidAssetId(textures?.[key]);
            if (assetId) textureIds.add(assetId);
        });
        return;
    }

    Object.values(asRecord).forEach(value => {
        collectTextureIdsFromMaterialSettings(value, textureIds);
    });
};

const collectTextureIdsFromObjectMaterials = (object: THREE.Object3D, textureIds: Set<string>) => {
    const collectTextureId = (texture: THREE.Texture | null | undefined) => {
        if (!texture) return;

        const userData = texture.userData as {imageId?: unknown; sourceFile?: unknown} | undefined;
        const imageId = userData?.imageId;
        if (typeof imageId === "string" && isAssetId(imageId)) {
            textureIds.add(imageId);
            return;
        }

        const sourceFile = userData?.sourceFile;
        const sourceAssetId =
            typeof sourceFile === "string" ? parseMaterialAssetIdWithRevision(sourceFile)?.assetId : null;
        if (sourceAssetId && isAssetId(sourceAssetId)) {
            textureIds.add(sourceAssetId);
            return;
        }

        const directSourceAssetId =
            typeof (texture as any).sourceFile === "string"
                ? parseMaterialAssetIdWithRevision((texture as any).sourceFile)?.assetId
                : null;
        if (directSourceAssetId && isAssetId(directSourceAssetId)) {
            textureIds.add(directSourceAssetId);
        }
    };

    object.traverse(child => {
        if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.SkinnedMesh)) return;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => {
            const materialRecord = material as Record<string, unknown>;
            Object.values(materialRecord).forEach(value => {
                if (value instanceof THREE.Texture) {
                    collectTextureId(value);
                    return;
                }

                if (Array.isArray(value)) {
                    value.forEach(item => {
                        if (item instanceof THREE.Texture) {
                            collectTextureId(item);
                        }
                    });
                }
            });

            const uniformRecord = (material as {uniforms?: Record<string, {value?: unknown}>}).uniforms;
            if (!uniformRecord) return;

            Object.values(uniformRecord).forEach(uniform => {
                const uniformValue = uniform?.value;
                if (uniformValue instanceof THREE.Texture) {
                    collectTextureId(uniformValue);
                    return;
                }

                if (Array.isArray(uniformValue)) {
                    uniformValue.forEach(item => {
                        if (item instanceof THREE.Texture) {
                            collectTextureId(item);
                        }
                    });
                }
            });
        });
    });
};

const ExistingTextureItem = ({
    assetId,
    isSelected,
    onSelect,
}: {
    assetId: string;
    isSelected: boolean;
    onSelect: (assetId: string) => void;
}) => {
    const {url} = useAssetImageDerivative(assetId);

    return (
        <TexturePickerItem
            $selected={isSelected}
            onClick={event => {
                event.stopPropagation();
                onSelect(assetId);
            }}
            title={assetId}
        >
            {url ? 
                <img src={url}
                    alt="texture"
                    style={{width: "100%", height: "100%", objectFit: "cover"}}
                />
             : 
                <div style={{fontSize: "9px", color: "#b3b3bf", padding: "4px"}}>N/A</div>
            }
        </TexturePickerItem>
    );
};

export const TextureUpload = ({
    materialSettings,
    textureKey,
    label,
    setMaterialSettings,
    saveMaterialSettingsToUserData,
    handleSelectTexture,
    selectedTexture,
}: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const selected = editor?.getSelectedObject();
    const {context, setAssetRevision} = useAssetResolutionContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [pickerFilter, setPickerFilter] = useState<TexturePickerFilter>("all");
    const [textureBuckets, setTextureBuckets] = useState<{
        allTextureIds: string[];
        inUseTextureIds: string[];
        currentMaterialTextureIds: string[];
    }>({
        allTextureIds: [],
        inUseTextureIds: [],
        currentMaterialTextureIds: [],
    });
    const {uploadImage} = useImageUploader();
    const {url} = useAssetImageDerivative(
        parseMaterialAssetIdWithRevision(materialSettings.textures[textureKey])?.assetId,
    );

    useOnClickOutside(pickerRef as React.RefObject<HTMLDivElement>, () => setIsPickerOpen(false));

    const computeTextureBuckets = () => {
        const sceneTextureIds = new Set<string>();
        const objectTextureIds = new Set<string>();
        const currentMaterialIds = new Set<string>();

        const scene = editor?.scene;
        if (scene) {
            scene.traverse(obj => {
                collectTextureIdsFromMaterialSettings(obj.userData?.materialSettings, sceneTextureIds);
            });
            collectTextureIdsFromObjectMaterials(scene, sceneTextureIds);
        }

        if (selected) {
            collectTextureIdsFromMaterialSettings(selected.userData?.materialSettings, objectTextureIds);
            collectTextureIdsFromObjectMaterials(selected, objectTextureIds);
        }

        MATERIAL_TEXTURE_KEYS.forEach(key => {
            const assetId = getValidAssetId(materialSettings.textures[key]);
            if (assetId) currentMaterialIds.add(assetId);
        });

        const activeTextureId = getValidAssetId(materialSettings.textures[textureKey]);
        if (activeTextureId) {
            sceneTextureIds.add(activeTextureId);
            objectTextureIds.add(activeTextureId);
            currentMaterialIds.add(activeTextureId);
        }

        return {
            allTextureIds: Array.from(sceneTextureIds),
            inUseTextureIds: Array.from(objectTextureIds),
            currentMaterialTextureIds: Array.from(currentMaterialIds),
        };
    };

    useEffect(() => {
        if (!isPickerOpen) return;

        const refreshBuckets = () => {
            setTextureBuckets(computeTextureBuckets());
        };

        refreshBuckets();

        global.app?.on("objectChanged.TextureUploadPicker", refreshBuckets);
        return () => {
            global.app?.on("objectChanged.TextureUploadPicker", null);
        };
    }, [isPickerOpen, editor?.scene, selected, materialSettings.textures, textureKey]);

    const filteredTextureIds = useMemo(() => {
        const {allTextureIds, inUseTextureIds, currentMaterialTextureIds} = textureBuckets;
        if (pickerFilter === "inUse") return inUseTextureIds;
        if (pickerFilter === "currentMaterial") return currentMaterialTextureIds;
        return allTextureIds;
    }, [pickerFilter, textureBuckets]);

    const handlePreviewClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
            handleSelectTexture();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selected) return;

        if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
            showToast({type: "error", title: "Unsupported file format. Supported formats: PNG, JPEG, WEBP, GIF"});
            return;
        }

        try {
            const {assetId, revisionId} = await uploadImage(file);
            handleTextureUpload(textureKey, assetId, revisionId);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleTextureUpload = (key: keyof IMaterialSettingsTextures, imageId: string, revisionId: string) => {
        if (!selected) return;
        new THREE.TextureLoader().load(
            imageId,
            texture => {
                applyTexture(selected, key, imageId, texture, revisionId);
            },
            undefined,
            () => {
                applyTexture(selected, key, imageId, null, revisionId);
            },
        );
    };

    const applyTexture = (
        selected: THREE.Object3D,
        key: keyof IMaterialSettingsTextures,
        imageId: string,
        _texture: THREE.Texture | null,
        revisionID?: string,
    ) => {
        if (revisionID) {
            setAssetRevision(imageId, revisionID);
        }

        const previousValue = materialSettings.textures[key];
        const isFirstBaseUpload = key === "base" && (!previousValue || previousValue === "__deleted__");

        // Do not mutate materials directly; parent effect will handle applying maps
        const materialSettingsHolder: IMaterialSettings = {
            ...materialSettings,
            textures: {
                ...materialSettings.textures,
                [key]: imageId,
            },
            // On first base texture upload, reset color to white so the
            // texture is displayed as-authored, but preserve existing
            // transparency instead of forcing alpha blending.
            ...isFirstBaseUpload && {
                texturesSettings: {
                    ...materialSettings.texturesSettings,
                    color: "#ffffff",
                },
            },
        };

        setMaterialSettings(materialSettingsHolder);
        saveMaterialSettingsToUserData(selected, materialSettingsHolder);
    };

    const handleSelectExistingTexture = (assetId: string) => {
        if (!selected) return;

        const revisionID = context.assetIdToRevisionId?.[assetId];
        applyTexture(selected, textureKey, assetId, null, revisionID);
        setIsPickerOpen(false);
        handleSelectTexture();
    };

    const handleTextureDelete = () => {
        if (!selected) return;

        const materialSettingsHolder = {
            ...materialSettings,
            textures: {
                ...materialSettings.textures,
                [textureKey]: "__deleted__", // Special marker to indicate intentional removal
            },
        };

        setMaterialSettings(materialSettingsHolder);
        saveMaterialSettingsToUserData(selected, materialSettingsHolder);
    };

    const isUploaded = url && url !== "__deleted__" && !materialSettings.textures[textureKey].includes("__deleted__");

    return (
        <TextureWrapper>
            <Preview
                $active={selectedTexture === textureKey}
                onClick={!isUploaded ? handlePreviewClick : handleSelectTexture}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {isUploaded ? 
                    <>
                        <img src={url}
                            alt={label}
                            style={{width: "100%", height: "100%", objectFit: "cover"}}
                        />
                    </>
                 : 
                    <UploadView>
                        <img src={uploadIcon}
                            alt=""
                        />
                        <div className="text">Upload</div>
                    </UploadView>
                }
                {(isHovered || isPickerOpen) && 
                    <PreviewActions>
                        <PreviewActionButton
                            onClick={event => {
                                event.stopPropagation();
                                handleSelectTexture();
                                setIsPickerOpen(prev => !prev);
                            }}
                        >
                            <img
                                src={arrowDownIcon}
                                alt="select existing texture"
                                style={{transform: isPickerOpen ? "rotate(180deg)" : "rotate(0deg)"}}
                            />
                        </PreviewActionButton>
                        {isUploaded && 
                            <DeleteButton
                                onClick={event => {
                                    event.stopPropagation();
                                    handleTextureDelete();
                                }}
                            >
                                <img src={deleteIcon}
                                    alt="delete"
                                />
                            </DeleteButton>
                        }
                    </PreviewActions>
                }
            </Preview>
            {isPickerOpen && 
                <TexturePickerPopup ref={pickerRef}
                    onClick={event => event.stopPropagation()}
                >
                    <TexturePickerFilters>
                        <TexturePickerFilterButton
                            $active={pickerFilter === "all"}
                            onClick={event => {
                                event.stopPropagation();
                                setPickerFilter("all");
                            }}
                        >
                            All
                        </TexturePickerFilterButton>
                        <TexturePickerFilterButton
                            $active={pickerFilter === "inUse"}
                            onClick={event => {
                                event.stopPropagation();
                                setPickerFilter("inUse");
                            }}
                        >
                            In Use
                        </TexturePickerFilterButton>
                        <TexturePickerFilterButton
                            $active={pickerFilter === "currentMaterial"}
                            onClick={event => {
                                event.stopPropagation();
                                setPickerFilter("currentMaterial");
                            }}
                        >
                            Current Material
                        </TexturePickerFilterButton>
                    </TexturePickerFilters>
                    {filteredTextureIds.length > 0 ? 
                        <TexturePickerGrid>
                            {filteredTextureIds.map(assetId => 
                                <ExistingTextureItem
                                    key={assetId}
                                    assetId={assetId}
                                    isSelected={
                                        parseMaterialAssetIdWithRevision(materialSettings.textures[textureKey])
                                            ?.assetId === assetId
                                    }
                                    onSelect={handleSelectExistingTexture}
                                />,
                            )}
                        </TexturePickerGrid>
                     : 
                        <TexturePickerEmpty>No textures found for this filter</TexturePickerEmpty>
                    }
                </TexturePickerPopup>
            }
            <TextureLabel>{label}</TextureLabel>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/gif"
                style={{display: "none"}}
                onChange={handleFileChange}
            />
        </TextureWrapper>
    );
};
