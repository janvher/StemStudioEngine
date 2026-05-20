import {useEffect, useState} from "react";
import {LinearToneMapping, ReinhardToneMapping, CineonToneMapping, ACESFilmicToneMapping} from "three";

import {NumberRow, Row} from "./common";
import {toneMappingTypeOptions, DEFAULT_TONE_MAPPING} from "./constants";
import {SectionHeader} from "./SectionHeader";
import Editor from "../../../../../../../editor/Editor";
import global from "@stem/editor-oss/global";
import {RenderingSettings} from "@stem/editor-oss/types/GameSettingsTypes";
import {SelectRow} from "../../../common/SelectRow";
import {PanelSectionTitleSecondary} from "../../../RightPanel.style";

export const ToneMapping = () => {
    const app = global.app!;
    const editor = app.editor as Editor & {rendering: RenderingSettings};
    const environmentManager = app.environmentManager!;

    const [toneMappingType, setToneMappingType] = useState(() => {
        if (editor.rendering.toneMapping && editor.rendering.toneMapping.type) {
            return editor.rendering.toneMapping.type;
        }
        if (!editor.renderer) return "None";
        switch (editor.renderer.toneMapping) {
            case LinearToneMapping:
                return "Linear";
            case ReinhardToneMapping:
                return "Reinhard";
            case CineonToneMapping:
                return "Cineon";
            case ACESFilmicToneMapping:
                return "ACESFilmic";
            default:
                return "None";
        }
    });

    const [exposure, setExposure] = useState(() => {
        if (editor.rendering.toneMapping && typeof editor.rendering.toneMapping.exposure === "number") {
            return editor.rendering.toneMapping.exposure;
        }
        return editor.renderer ? editor.renderer.toneMappingExposure : 1.0;
    });

    const isToneMappingModified = () =>
        toneMappingType !== DEFAULT_TONE_MAPPING.type || exposure !== DEFAULT_TONE_MAPPING.exposure;

    const resetToneMapping = () => {
        setToneMappingType(DEFAULT_TONE_MAPPING.type);
        setExposure(DEFAULT_TONE_MAPPING.exposure);
    };

    useEffect(() => {
        void environmentManager.updateEnvironmentSettings({
            toneMapping: {type: toneMappingType, exposure},
        });
    }, [toneMappingType, exposure]);

    return (
        <>
            <div className="box">
                <SectionHeader
                    title="Tone Mapping"
                    showReset={isToneMappingModified()}
                    onReset={resetToneMapping}
                    tooltip="Maps HDR lighting into the displayable range. ACES plus exposure around 0.8-1.2 is a strong default for most scenes. Raise exposure to lift darker scenes and lower it when highlights clip too aggressively."
                />
            </div>
            <Row>
                <PanelSectionTitleSecondary>Type</PanelSectionTitleSecondary>
                <SelectRow
                    label=""
                    data={toneMappingTypeOptions}
                    value={toneMappingTypeOptions.find(opt => opt.key === toneMappingType) || toneMappingTypeOptions[0]}
                    onChange={item => setToneMappingType(item.key)}
                    disableTyping
                    width="110px"
                    labelTooltip="Controls how high dynamic range lighting is compressed onto the display. ACES is a strong default for filmic scenes, Reinhard is softer, Linear is more raw, and None is mainly useful for debug or very stylized looks."
                />
            </Row>
            <NumberRow
                label="Exposure"
                value={exposure}
                onChange={setExposure}
                min={0}
                max={10}
                decimalPlaces={2}
                labelTooltip="Overall scene brightness after tone mapping. Typical values are 0.8-1.2 for balanced lighting, 1.2-2 for darker scenes that need lifting, and below 1 when highlights blow out too easily."
            />
        </>
    );
};
