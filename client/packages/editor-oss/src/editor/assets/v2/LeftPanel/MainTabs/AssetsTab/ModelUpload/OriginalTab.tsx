import styled from "styled-components";

import { ContentWrapper } from './ModelPreview.style';
import { UploadSettings } from './types';
import { StyledRange } from "../../../../common/StyledRange";
import { TextInput } from "../../../../common/TextInput";
import { PanelCheckbox } from "../../../../RightPanel/common/PanelCheckbox";

const Wrapper = styled.div`
    display: flex;
    column-gap: 8px;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    input {
        width: 50px;
        text-align: center;
    }
`;

const VoxelSliderWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
`;

const SliderLabel = styled.div`
    font-size: 12px;
    color: var(--theme-text-color);
    font-weight: 400;
`;

type OriginalTabProps = {
    settings: UploadSettings;
    setSettings: (settings: UploadSettings) => void;
    hideHumanoidOption?: boolean;
};

export const OriginalTab = ({
    settings,
    setSettings,
    hideHumanoidOption,
}: OriginalTabProps) => {
    const isVoxelized = settings.voxelize;

    const checkboxes: { label: string; key: keyof UploadSettings }[] = [
        { label: "Is this a human shaped Model", key: "isHumanoid" },
        { label: "Voxelize model", key: "voxelize" },
        { label: "Remove hidden faces", key: "removeHiddenFaces" },
        { label: "Optimize model", key: "simplifyModel" },
        { label: "Compress model", key: "compressModel" },
        { label: "Compress textures", key: "compressTextures" },
        { label: "Limit texture size", key: "limitTextureSize" },
        { label: "Generate texture atlas", key: "generateAtlas" },
    ].filter(c => {
        // Hide humanoid option if specified
        if (hideHumanoidOption && c.key === "isHumanoid") return false;
        // Hide texture options when voxelized
        if (isVoxelized && (c.key === "compressTextures" || c.key === "limitTextureSize" || c.key === "generateAtlas")) return false;
        // Hide removeHiddenFaces when NOT voxelized
        if (!isVoxelized && c.key === "removeHiddenFaces") return false;
        return true;
    }) as {
        label: string;
        key: keyof UploadSettings;
    }[];

    const onToggleChange = (key: keyof UploadSettings, value: boolean) => {
        setSettings({
            ...settings,
            [key]: value,
        });
    };

    const setMaxTextureSize = (value: number) => {
        setSettings({
            ...settings,
            maxTextureSize: value,
        });
    };

    const setVoxelResolution = (value: number) => {
        setSettings({
            ...settings,
            voxelResolution: value,
        });
    };

    return (
        <ContentWrapper>
            {checkboxes.map(({ label, key }) =>
                <PanelCheckbox
                    key={key}
                    text={label}
                    id={key}
                    checked={Boolean(settings[key])}
                    onChange={e => onToggleChange(key, e.target.checked)}
                    v2
                    isGray
                    regular
                />,
            )}
            {isVoxelized &&
                <VoxelSliderWrapper>
                    <SliderLabel>
                        Voxel resolution: {settings.voxelResolution ?? 32}
                    </SliderLabel>
                    <StyledRange
                        value={settings.voxelResolution ?? 32}
                        setValue={setVoxelResolution}
                        min={4}
                        max={128}
                        step={1}
                    />
                </VoxelSliderWrapper>
            }
            {!isVoxelized &&
                <Wrapper>
                    Maximum texture size
                    <TextInput
                        value={String(settings.maxTextureSize ?? "")}
                        setValue={(value: string) => setMaxTextureSize(Number(value))}
                        disabled={!settings.limitTextureSize}
                    />
                </Wrapper>
            }
        </ContentWrapper>
    );
};
