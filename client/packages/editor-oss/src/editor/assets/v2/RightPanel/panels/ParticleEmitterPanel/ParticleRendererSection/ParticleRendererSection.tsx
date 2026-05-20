import React, {useState, useEffect, useReducer} from "react";
import styled from "styled-components";
import {Texture, TextureLoader, BufferGeometry} from "three";
import {ParticleSystem, RenderMode, ValueGenerator} from "three.quarks";

import {NumericSettings} from "./NumericSettings";
import {SelectSettings} from "./SelectSettings";
import global from "@stem/editor-oss/global";
import {Item} from "../../../../common/BasicCombobox/BasicCombobox";
import StyledColorPicker from "../../../../common/StyledColorPicker/StyledColorPicker";
import {UploadField} from "../../../../common/UploadField/UploadField";
import {FileData} from "../../../../types/file";
import {ColorSelectionRow} from "../../../common/ColorSelectionRow";
import {FieldType} from "../../../common/FieldEditor/FieldEditor";
import {GeneratorEditor, GenericGenerator} from "../../../common/GeneratorEditor/GeneratorEditor";
import {GeometrySelect} from "../../../common/GeometrySelect";
import {NumericInputRow} from "../../../common/NumericInputRow";
import {PanelCheckbox} from "../../../common/PanelCheckbox";
import {SelectRow} from "../../../common/SelectRow";
import {Separator} from "../../../common/Separator";
import {StyledRowWrapper} from "../../../common/StyledRowWrapper";

export const blendingOptions: Item[] = [
    {key: "Normal", value: "Normal"},
    {key: "Additive", value: "Additive"},
];

export const booleanOptions: Item[] = [
    {key: "True", value: "True"},
    {key: "False", value: "False"},
];

const TextureSection = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

interface ParticleRendererSectionProps {
    particleSystem: ParticleSystem;
}

export const ParticleRendererSection: React.FC<ParticleRendererSectionProps> = ({particleSystem}) => {
    const app = global?.app;
    const editor = app?.editor;
    const [uploadedTexture, setUploadedTexture] = useState<FileData | null | string>(null);
    const [openColorPicker, setOpenColorPicker] = useState(false);
    const [, forceUpdate] = useReducer(x => x + 1, 0);

    const toggleRenderOrder = () => {
        // Reset render order to ensure texture is applied correctly
        const prevRenderOrder = particleSystem.renderOrder;
        particleSystem.renderOrder = 0;
        particleSystem.renderOrder = prevRenderOrder;
    };

    // Initialize texture state from particle system
    useEffect(() => {
        if (particleSystem.material && "map" in particleSystem.material) {
            const currentTexture = (particleSystem.material as any).map;
            if (currentTexture && currentTexture.image && currentTexture.image.src) {
                setUploadedTexture(currentTexture.image.src);
            }
        }
    }, [particleSystem]);

    const updateProperties = () => {
        // Trigger update in the application
        if (app && editor?.selected) {
            app.call("objectChanged", editor, editor.selected);
            app.call("emitterUpdate");
        }
        forceUpdate();
    };

    const onChangeSpeedFactor = (order: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (particleSystem as any).speedFactor = order;
        updateProperties();
    };

    const onChangeStartTile = (index: GenericGenerator) => {
        particleSystem.startTileIndex = index as ValueGenerator;
        updateProperties();
    };

    const onTextureUpload = (textureUrl: string) => {
        // Load texture and apply to particle system
        const loader = new TextureLoader();
        loader.load(textureUrl, (texture: Texture) => {
            // Apply texture to particle system material
            if (particleSystem.material && "map" in particleSystem.material) {
                (particleSystem.material as any).map = texture;
                (particleSystem.material as any).needsUpdate = true;
            }
            particleSystem.rendererSettings.material = particleSystem.material;
            // eslint-disable-next-line no-self-assign
            particleSystem.rendererSettings.instancingGeometry = particleSystem.rendererSettings.instancingGeometry;
            particleSystem.stop?.();
            particleSystem.play?.();
            toggleRenderOrder(); // Reset render order to ensure texture is applied correctly
            // Update the uploaded texture state
            updateProperties();
        });
    };

    const onTextureDelete = () => {
        // Remove texture from particle system
        if (particleSystem.material && "map" in particleSystem.material) {
            (particleSystem.material as any).map = null;
            (particleSystem.material as any).needsUpdate = true;
        }
        toggleRenderOrder(); // Reset render order to ensure texture is applied correctly
        updateProperties();
    };

    // --- Transparent ---
    const onTransparentChange = (value: boolean) => {
        if (!particleSystem.material) return;
        particleSystem.material.transparent = value;
        particleSystem.material.needsUpdate = true;
        particleSystem.material.userData.transparent = value;
        updateProperties();
    };

    // --- Blend Color ---
    const onBlendColorChange = (value: string) => {
        if (!particleSystem.material) return;
        particleSystem.material.blendColor.setStyle(value);
        particleSystem.material.needsUpdate = true;
        particleSystem.material.userData.blendColor = particleSystem.material.blendColor.toArray();
        updateProperties();
    };

    const onChangeGeometry = (geometry: BufferGeometry) => {
        // Apply geometry to particle system
        particleSystem.instancingGeometry = geometry;
        updateProperties();
    };

    const onChangeRenderMode = (selectedItem: Item) => {
        const value = selectedItem.value;
        switch (value) {
            case "BillBoard":
                particleSystem.renderMode = RenderMode.BillBoard;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (particleSystem as any).speedFactor = 0;
                break;
            case "Mesh":
                particleSystem.renderMode = RenderMode.Mesh;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (particleSystem as any).speedFactor = 0;
                break;
            case "StretchedBillBoard":
                particleSystem.renderMode = RenderMode.StretchedBillBoard;
                break;
            case "Trail":
                particleSystem.renderMode = RenderMode.Trail;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (particleSystem as any).speedFactor = 0;
                break;
        }
        updateProperties();
    };

    // Options for dropdowns
    const renderModeOptions: Item[] = Object.keys(RenderMode)
        .map(key => RenderMode[key as keyof typeof RenderMode])
        .filter(value => typeof value === "string")
        .map(name => ({
            key: name,
            value: name,
        }));

    const valueFunctionTypes: FieldType[] = ["value"];

    // Get current values for dropdowns
    const currentRenderMode =
        renderModeOptions.find(opt => opt.value === RenderMode[particleSystem.renderMode]) || renderModeOptions[0];

    return (
        <>
            <SelectRow
                label="Render Mode"
                data={renderModeOptions}
                value={currentRenderMode}
                onChange={onChangeRenderMode}
                $margin="0 0 8px 0"
            />

            {particleSystem.renderMode === RenderMode.StretchedBillBoard && (
                <NumericInputRow
                    label="Speed Factor"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    value={(particleSystem as any).speedFactor || 0}
                    setValue={onChangeSpeedFactor}
                    $margin="0 0 8px 0"
                />
            )}

            {particleSystem.renderMode === RenderMode.Mesh && (
                <GeometrySelect
                    name="Mesh"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    value={(particleSystem as any).instancingGeometry}
                    onChange={onChangeGeometry}
                    $margin="0 0 8px 0"
                />
            )}

            <SelectSettings
                updateProperties={updateProperties}
                particleSystem={particleSystem}
            />

            {openColorPicker && (
                <StyledColorPicker
                    color={particleSystem.material?.blendColor.getStyle() ?? "#ffffff"}
                    setColor={onBlendColorChange}
                    hide={() => setOpenColorPicker(false)}
                    hideAlpha
                />
            )}
            <ColorSelectionRow
                label="Color"
                value={particleSystem.material?.blendColor.getStyle() ?? "#ffffff"}
                setValue={onBlendColorChange}
            />

            <PanelCheckbox
                text="Transparent"
                checked={particleSystem.material?.transparent ?? false}
                onChange={e => onTransparentChange(!!e.target.checked)}
                v2
                isGray
                regular
            />
            <Separator
                margin="0 0 8px 0"
                invisible
            />

            <NumericSettings
                particleSystem={particleSystem}
                updateProperties={updateProperties}
            />

            <GeneratorEditor
                allowedType={valueFunctionTypes}
                name="UVTile Start"
                selectLabel="Tile Start Type"
                value={particleSystem.startTileIndex}
                onChange={onChangeStartTile}
                margin="0 0 8px 0"
            />

            <PanelCheckbox
                text="Blend Tiles"
                checked={particleSystem.blendTiles ?? false}
                onChange={e => {
                    particleSystem.blendTiles = !!e.target.checked;
                    updateProperties();
                }}
                v2
                isGray
                regular
            />
            <Separator
                margin="0 0 8px 0"
                invisible
            />

            <StyledRowWrapper
                $margin="12px 0 8px 0"
                style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                    rowGap: "8px",
                }}
            >
                <span className="text">Texture</span>
                <TextureSection>
                    <UploadField
                        width="120px"
                        height="80px"
                        uploadedFile={uploadedTexture}
                        setUploadedFile={setUploadedTexture}
                        uploadHandler={onTextureUpload}
                        deleteHandler={onTextureDelete}
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        withButton={false}
                        label="Select Texture"
                    />
                </TextureSection>
            </StyledRowWrapper>

            <NumericInputRow
                label="Near 0-1)"
                value={particleSystem.softNearFade ?? 0}
                max={1}
                min={0}
                setValue={(v: number) => {
                    particleSystem.softNearFade = v;
                    updateProperties();
                }}
                $margin="0 0 8px 0"
            />

            <NumericInputRow
                label="Far 0-1)"
                value={particleSystem.softFarFade ?? 1}
                max={1}
                min={0}
                setValue={(v: number) => {
                    particleSystem.softFarFade = v;
                    updateProperties();
                }}
                $margin="0 0 8px 0"
            />

            <PanelCheckbox
                text="Soft Particles"
                checked={particleSystem.softParticles ?? false}
                onChange={e => {
                    particleSystem.softParticles = !!e.target.checked;
                    updateProperties();
                }}
                v2
                isGray
                regular
            />
        </>
    );
};
