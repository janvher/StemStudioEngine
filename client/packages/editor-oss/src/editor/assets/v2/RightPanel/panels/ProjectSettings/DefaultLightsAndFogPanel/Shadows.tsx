import {shadowMapTypeOptions, DEFAULT_SHADOWS} from "./constants";
import {SectionHeader} from "./SectionHeader";
import global from "@stem/editor-oss/global";
import {PanelCheckbox} from "../../../common/PanelCheckbox";
import {SelectRow} from "../../../common/SelectRow";

interface Props {
    useShadows: boolean;
    shadowMapType: number;
    setUseShadows: React.Dispatch<React.SetStateAction<boolean>>;
    setShadowMapType: React.Dispatch<React.SetStateAction<number>>;
}

export const Shadows = ({useShadows, shadowMapType, setUseShadows, setShadowMapType}: Props) => {
    const app = global.app!;
    const environmentManager = app.environmentManager!;

    const isShadowsModified = () => useShadows !== DEFAULT_SHADOWS.enabled || shadowMapType !== DEFAULT_SHADOWS.mapType;

    const resetShadows = () => {
        setUseShadows(DEFAULT_SHADOWS.enabled);
        if (app.editor) app.editor.useShadows = DEFAULT_SHADOWS.enabled;
        setShadowMapType(DEFAULT_SHADOWS.mapType);
        void environmentManager.updateEnvironmentSettings({
            shadowMapType: DEFAULT_SHADOWS.mapType,
        });
        if (app.options) {
            app.options.shadowMapType = DEFAULT_SHADOWS.mapType;
        }
    };

    const handleShadowMapTypeChange = (item: {key: string; value: string}) => {
        const type = Number(item.key);
        setShadowMapType(type);

        // Update shadow settings via environment manager
        void environmentManager.updateEnvironmentSettings({
            shadowMapType: type,
        });

        if (app.options) {
            app.options.shadowMapType = type;
        }
    };

    return (
        <>
            <div className="box">
                <SectionHeader
                    title="Shadows"
                    showReset={isShadowsModified()}
                    onReset={resetShadows}
                    tooltip="Enables real-time shadow casting from lights. Typical shadow maps are 1024-2048 for general use. Higher-quality filtering and larger maps look better, but they cost more GPU time and memory."
                />
            </div>
            <PanelCheckbox
                v2
                text="Real-time Shadows"
                checked={!!useShadows}
                isGray
                regular
                onChange={() => {
                    setUseShadows(prev => {
                        if (app.editor) app.editor.useShadows = !prev;
                        return !prev;
                    });
                }}
                tooltipText="Enables dynamic shadows from shadow-casting lights. Best reserved for key lights. Typical real-time scenes keep this on, but use fewer shadow-casting lights on mobile or large scenes."
            />
            <div />
            <SelectRow
                label="Shadow Map Type"
                data={shadowMapTypeOptions}
                value={shadowMapTypeOptions.find(opt => opt.key === String(shadowMapType)) || shadowMapTypeOptions[2]}
                onChange={handleShadowMapTypeChange}
                disableTyping
                width="80px"
                $margin="0"
                labelTooltip="Chooses the filtering method for shadow maps. Softer or higher-quality modes usually look better but cost more GPU time. Start with PCF Soft for general use and only change this if quality or performance demands it."
            />
            <div style={{fontSize: 11, color: "#888", fontStyle: "italic"}}>
                Shadow map type changes will take effect after reloading.
            </div>
        </>
    );
};
