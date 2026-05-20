import {useEffect, useState} from "react";
import styled from "styled-components";

import {SettingsLabel} from "./BaseTextureSettings.style";
import StyledColorPicker from "../../../../common/StyledColorPicker/StyledColorPicker";
import {Tooltip} from "../../../../common/Tooltip";
import {IMaterialSettings, ITexturesSettings} from "../types";

interface Props {
    handleSettingsChange: (key: keyof ITexturesSettings, value: any) => void;
    materialSettings: IMaterialSettings;
    property?: keyof ITexturesSettings;
    label?: string;
    tooltip?: string;
}

export const ColorSetting = ({handleSettingsChange, materialSettings, property = "color", label = "Color", tooltip}: Props) => {
    const [selectedColor, setSelectedColor] = useState((materialSettings.texturesSettings[property] as string) || "#ffffff");
    const [showColorPicker, setShowColorPicker] = useState(false);

    useEffect(() => {
        setSelectedColor((materialSettings.texturesSettings[property] as string) || "#ffffff");
    }, [materialSettings, property]);

    const handleSelectedColorChange = (value: string) => {
        setSelectedColor(value);
        handleSettingsChange(property, value);
    };

    return (
        <Wrapper>
            {tooltip ?
                <Tooltip content={tooltip}
                    maxWidth="240px"
                    triggerFullWidth={false}
                >
                    <SettingsLabel>{label}</SettingsLabel>
                </Tooltip>
             :
                <SettingsLabel>{label}</SettingsLabel>
            }
            <ColorBox style={{backgroundColor: selectedColor}}
                onClick={() => setShowColorPicker(true)}
            />
            {showColorPicker && 
                <StyledColorPicker
                    color={selectedColor}
                    setColor={handleSelectedColorChange}
                    hide={() => setShowColorPicker(false)}
                />
            }
        </Wrapper>
    );
};

const Wrapper = styled.div`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
`;
const ColorBox = styled.div`
    width: 49px;
    height: 24px;
    border-radius: 8px;
`;
