/* eslint-disable import/order */
import {useEffect, useState} from "react";
import * as THREE from "three";
import global from "@stem/editor-oss/global";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {SelectRow} from "../../common/SelectRow";
import {MATERIAL_TYPES} from "@stem/editor-oss/types/editor";
import {ExpandablePanel} from "../../panels/Panels/Panels";
import {Separator} from "../../common/Separator";
import {NumericInputRow} from "../../common/NumericInputRow";
import {RowTitle} from "../../panels/Panels/Panels.styled";
import {TexturesFlexContainer} from "./MaterialRenderingSection.style";
import {TextureUpload} from "./TextureUpload";
import {BaseTextureSettings} from "./BaseTextureSettings/BaseTextureSettings";
import {
    EMPTY_TEXTURE_SETTINGS,
    EMPTY_TEXTURES,
    IMaterialSettings,
    IMaterialSettingsMap,
    IMaterialSettingsTextures,
    ITexturesSettings,
    MATERIAL_SETTING_KEY,
    TEXTURE_SETTINGS_LABELS,
    TEXTURE_SETTINGS_MAPS,
    VISIBLE_TEXTURES_BY_TYPE,
} from "./types";
import {
    generateMaterialPathKey,
    applyMaterialSettingsToObject,
    findMaterialByPathKey,
} from "../../../materials/materialUtils";
import {MaterialInfo} from "../../ModelEditorButtons/ModelEditorButtons";
import {useAssetResolutionContext} from "@stem/editor-oss/context/AssetResolutionContext";

const AVAILABLE_TEXTURES: Record<MATERIAL_TYPES, (keyof IMaterialSettingsTextures)[]> = {
    [MATERIAL_TYPES.SPECULAR]: ["base", "specular", "ambient", "roughness", "normal", "emissive"],
    [MATERIAL_TYPES.METALLIC]: ["base", "metallic", "ambient", "roughness", "normal", "emissive"],
    [MATERIAL_TYPES.PBR]: ["base", "orm", "normal", "emissive"],
};

const getAvailableTexturesForType = (type: MATERIAL_TYPES): (keyof IMaterialSettingsTextures)[] =>
    AVAILABLE_TEXTURES[type] ?? ["base"];

const generateMaterialTypeOptions = () => {
    return Object.entries(MATERIAL_TYPES).map(([key, value], index) => ({
        key: index.toString(),
        value: value,
        label: key.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase()),
    }));
};

const getFirstAvailableTexture = (mat: THREE.Material | undefined): THREE.Texture | null | undefined => {
    if (!mat) return undefined;
    const m = mat as THREE.Material & {
        map?: THREE.Texture | null;
        normalMap?: THREE.Texture | null;
        roughnessMap?: THREE.Texture | null;
        metalnessMap?: THREE.Texture | null;
        specularMap?: THREE.Texture | null;
        emissiveMap?: THREE.Texture | null;
    };
    return m.map || m.normalMap || m.roughnessMap || m.metalnessMap || m.specularMap || m.emissiveMap;
};

const getMaterialProperties = (mat: THREE.Material | undefined): ITexturesSettings => {
    if (!mat) return EMPTY_TEXTURE_SETTINGS;
    const m = mat as THREE.Material & {
        color?: THREE.Color;
        normalScale?: THREE.Vector2;
        emissiveIntensity?: number;
        metalness?: number;
        roughness?: number;
        aoMapIntensity?: number;
        specularIntensity?: number;
        shininess?: number;
        specular?: THREE.Color;
        specularColor?: THREE.Color;
        emissive?: THREE.Color;
    };
    return {
        opacity: m.opacity ?? 1,
        useBaseAlpha: m.transparent ?? false,
        color: m.color ? "#" + m.color.getHexString() : "#ffffff",
        emissiveColor: m.emissive ? "#" + m.emissive.getHexString() : undefined,
        specularColor: m.specularColor
            ? "#" + m.specularColor.getHexString()
            : m.specular
              ? "#" + m.specular.getHexString()
              : undefined,
        metallic: m.metalness ?? 0,
        roughness: m.roughness ?? 1,
        emissiveIntensity: m.emissiveIntensity ?? 1,
        normalScale: m.normalScale?.x ?? 1,
        specularIntensity: m.specularIntensity ?? (m.shininess ? m.shininess / 30 : 1),
        strength: m.normalScale?.x ?? m.emissiveIntensity ?? 1,
        ao: m.aoMapIntensity ?? 1,
    };
};

const materialTypeOptions = generateMaterialTypeOptions();

type MaterialRenderingSectionV2Props = {
    materialInfo?: MaterialInfo | null;
    onSettingsChange?: (settings: IMaterialSettings, pathKey: string) => void;
};

export const MaterialRenderingSection = ({materialInfo, onSettingsChange}: MaterialRenderingSectionV2Props) => {
    const {context} = useAssetResolutionContext();
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const selected = editor?.getSelectedObject();

    const inferMaterialType = (mat: THREE.Material | undefined | null): MATERIAL_TYPES => {
        if (!mat) return MATERIAL_TYPES.SPECULAR;
        if (mat instanceof THREE.MeshPhysicalMaterial) return MATERIAL_TYPES.PBR;
        if (mat instanceof THREE.MeshStandardMaterial) return MATERIAL_TYPES.METALLIC;
        return MATERIAL_TYPES.SPECULAR;
    };

    const getAllChildrenWithMaterials = (object: THREE.Object3D) => {
        const result: Array<THREE.Mesh> = [];
        object.traverse(child => {
            if (child instanceof THREE.Mesh && child.material) {
                result.push(child as THREE.Mesh);
            }
        });
        return result;
    };

    const [materialSettings, setMaterialSettings] = useState<IMaterialSettings>({
        isDoubleSided: false,
        tileAmountX: 0.5,
        tileAmountY: 0.5,
        panningSpeedX: 0.5,
        panningSpeedY: 0.5,
        materialType: MATERIAL_TYPES.SPECULAR,
        textures: EMPTY_TEXTURES,
        texturesSettings: EMPTY_TEXTURE_SETTINGS,
    });
    const [selectedTexture, setSelectedTexture] = useState<keyof IMaterialSettingsTextures>();
    const [currentPathKey, setCurrentPathKey] = useState<string>("");

    const TEXTURE_EFFECTS_NUMERIC = [
        {
            label: TEXTURE_SETTINGS_LABELS.TILE_AMOUNT_X,
            value: materialSettings.tileAmountX,
            key: MATERIAL_SETTING_KEY.TILE_AMOUNT_X,
        },
        {
            label: TEXTURE_SETTINGS_LABELS.TILE_AMOUNT_Y,
            value: materialSettings.tileAmountY,
            key: MATERIAL_SETTING_KEY.TILE_AMOUNT_Y,
        },
        {
            label: TEXTURE_SETTINGS_LABELS.PANNING_SPEED_X,
            value: materialSettings.panningSpeedX,
            key: MATERIAL_SETTING_KEY.PANNING_SPEED_X,
        },
        {
            label: TEXTURE_SETTINGS_LABELS.PANNING_SPEED_Y,
            value: materialSettings.panningSpeedY,
            key: MATERIAL_SETTING_KEY.PANNING_SPEED_Y,
        },
    ];

    const saveMaterialSettingsToUserData = (selected: THREE.Object3D, settings: typeof materialSettings) => {
        if (!currentPathKey) return;

        if (onSettingsChange) {
            onSettingsChange(settings, currentPathKey);
        }
    };

    const updateMaterialSettings = (key: MATERIAL_SETTING_KEY, value: boolean | number | MATERIAL_TYPES | string) => {
        if (!selected) return;

        const materialSettingsHolder = {
            ...materialSettings,
            [key]: value,
        };

        setMaterialSettings(materialSettingsHolder);
        saveMaterialSettingsToUserData(selected, materialSettingsHolder);

        if (key === MATERIAL_SETTING_KEY.MATERIAL_TYPE) {
            const targetType = value as MATERIAL_TYPES;

            const availableTextures = getAvailableTexturesForType(targetType);
            const remappedTextures: IMaterialSettingsTextures = {
                ...materialSettingsHolder.textures,
            };

            if (targetType === MATERIAL_TYPES.METALLIC && materialSettings.materialType === MATERIAL_TYPES.SPECULAR) {
                if (!remappedTextures.metallic && remappedTextures.specular) {
                    remappedTextures.metallic = remappedTextures.specular;
                }
            }
            if (targetType === MATERIAL_TYPES.SPECULAR && materialSettings.materialType === MATERIAL_TYPES.METALLIC) {
                if (!remappedTextures.specular && remappedTextures.metallic) {
                    remappedTextures.specular = remappedTextures.metallic;
                }
            }
            if (targetType === MATERIAL_TYPES.PBR) {
                remappedTextures.specular = "";
                remappedTextures.metallic = "";
                remappedTextures.ambient = "";
                remappedTextures.roughness = "";
            }

            (Object.keys(remappedTextures) as (keyof IMaterialSettingsTextures)[]).forEach(texKey => {
                if (!availableTextures.includes(texKey)) {
                    remappedTextures[texKey] = "";
                }
            });

            const updatedSettingsAfterRemap: IMaterialSettings = {
                ...materialSettingsHolder,
                textures: remappedTextures,
            };
            setMaterialSettings(updatedSettingsAfterRemap);
            saveMaterialSettingsToUserData(selected, updatedSettingsAfterRemap);

            if (availableTextures.length > 0) {
                setSelectedTexture(availableTextures[0]);
            } else {
                setSelectedTexture(undefined);
            }

            return;
        }
    };

    useEffect(() => {
        if (!selected) return;

        const objectsWithMaterials = getAllChildrenWithMaterials(selected);
        if (objectsWithMaterials.length === 0) return;

        let targetMesh: THREE.Mesh | THREE.SkinnedMesh = objectsWithMaterials[0]!;
        let material: THREE.Material | undefined;
        let pathKey: string = "";
        let materialIndex = 0;

        if (materialInfo) {
            const result = findMaterialByPathKey(selected, materialInfo.pathKey);
            if (result) {
                targetMesh = result.mesh;
                material = result.material;
                pathKey = materialInfo.pathKey;
                materialIndex = result.index;
            } else {
                material = Array.isArray(targetMesh.material) ? targetMesh.material[0] : targetMesh.material;
                pathKey = generateMaterialPathKey(targetMesh, 0, selected);
                materialIndex = 0;
            }
        } else {
            material = Array.isArray(targetMesh.material) ? targetMesh.material[0] : targetMesh.material;
            pathKey = generateMaterialPathKey(targetMesh, 0, selected);
            materialIndex = 0;
        }

        setCurrentPathKey(pathKey);

        let storageObject: THREE.Object3D = selected;
        let curr: THREE.Object3D | null = selected;
        while (curr) {
            if (curr.userData.modelId || curr.userData.Url) {
                storageObject = curr;
                break;
            }
            if (curr.parent === curr) break;
            curr = curr.parent;
        }

        const storagePathKey =
            storageObject === selected ? pathKey : generateMaterialPathKey(targetMesh, materialIndex, storageObject);

        let settingsMap: IMaterialSettingsMap = {};
        const savedData = storageObject.userData.materialSettings as
            | IMaterialSettings
            | IMaterialSettingsMap
            | undefined;

        if (savedData) {
            if ("materialType" in savedData && "textures" in savedData) {
                applyMaterialSettingsToObject(storageObject, savedData, context);
                settingsMap = storageObject.userData.materialSettings as IMaterialSettingsMap;
            } else {
                settingsMap = savedData;
            }
        }

        const savedSettings: Partial<IMaterialSettings> = settingsMap[storagePathKey] || {};
        const derivedMaterialType = savedSettings.materialType ?? inferMaterialType(material);

        const activeTexture = getFirstAvailableTexture(material);

        const initialSettings: IMaterialSettings = {
            isDoubleSided: savedSettings.isDoubleSided ?? material?.side === THREE.DoubleSide,
            tileAmountX: savedSettings.tileAmountX ?? activeTexture?.repeat?.x ?? 1,
            tileAmountY: savedSettings.tileAmountY ?? activeTexture?.repeat?.y ?? 1,
            panningSpeedX: savedSettings.panningSpeedX ?? activeTexture?.offset?.x ?? 0,
            panningSpeedY: savedSettings.panningSpeedY ?? activeTexture?.offset?.y ?? 0,
            textures: savedSettings.textures ?? EMPTY_TEXTURES,
            materialType: derivedMaterialType,
            texturesSettings: savedSettings.texturesSettings ?? getMaterialProperties(material),
        };

        setMaterialSettings(initialSettings);

        if (savedSettings.materialType === undefined) {
            saveMaterialSettingsToUserData(selected, initialSettings);
        }

        const availableTextures = getAvailableTexturesForType(derivedMaterialType);
        if (!selectedTexture || !availableTextures.includes(selectedTexture)) {
            setSelectedTexture(availableTextures[0]);
        }
    }, [editor?.selected, materialInfo]);

    return (
        <div className="Section MaterialSection">
            <SelectRow
                noPortal
                disableTyping
                $margin="0"
                label="Material Type"
                data={materialTypeOptions}
                value={
                    materialTypeOptions.find(item => item.value === materialSettings.materialType) || {
                        key: "0",
                        value: MATERIAL_TYPES.SPECULAR,
                    }
                }
                onChange={item => {
                    const newType = item?.value || MATERIAL_TYPES.SPECULAR;
                    updateMaterialSettings(MATERIAL_SETTING_KEY.MATERIAL_TYPE, newType);

                    const availableTextures = getAvailableTexturesForType(newType as MATERIAL_TYPES);
                    if (!selectedTexture || !availableTextures.includes(selectedTexture)) {
                        setSelectedTexture(availableTextures[0]);
                    }
                }}
            />
            <ExpandablePanel label="Texture Effects"
                renderArrow
            >
                <Separator invisible
                    margin="8px 0 0"
                />
                <PanelCheckbox
                    v2
                    text="Double Sided"
                    checked={materialSettings.isDoubleSided}
                    isGray
                    regular
                    onChange={() =>
                        updateMaterialSettings(MATERIAL_SETTING_KEY.IS_DOUBLE_SIDED, !materialSettings.isDoubleSided)
                    }
                />
                <Separator invisible
                    margin="8px 0 0"
                />
                {TEXTURE_EFFECTS_NUMERIC.map(({label, value, key}) => 
                    <NumericInputRow
                        key={label}
                        label={label}
                        value={value}
                        setValue={val => updateMaterialSettings(key, val)}
                    />,
                )}
            </ExpandablePanel>
            <div style={{width: "100%"}}>
                <RowTitle>Texture Settings</RowTitle>
                <Separator invisible
                    margin="8px 0 0"
                />
                <TexturesFlexContainer>
                    {TEXTURE_SETTINGS_MAPS.filter(({key}) =>
                        VISIBLE_TEXTURES_BY_TYPE[materialSettings.materialType].includes(key),
                    ).map(({label, key}) => 
                        <TextureUpload
                            key={key}
                            label={label}
                            textureKey={key}
                            materialSettings={materialSettings}
                            setMaterialSettings={setMaterialSettings}
                            saveMaterialSettingsToUserData={saveMaterialSettingsToUserData}
                            selectedTexture={selectedTexture}
                            handleSelectTexture={() => setSelectedTexture(key)}
                        />,
                    )}
                </TexturesFlexContainer>
                <Separator invisible
                    margin="16px 0 0"
                />
                {selectedTexture && 
                    <BaseTextureSettings
                        materialSettings={materialSettings}
                        setMaterialSettings={setMaterialSettings}
                        saveMaterialSettingsToUserData={saveMaterialSettingsToUserData}
                        selectedTexture={selectedTexture}
                    />
                }
            </div>
        </div>
    );
};
