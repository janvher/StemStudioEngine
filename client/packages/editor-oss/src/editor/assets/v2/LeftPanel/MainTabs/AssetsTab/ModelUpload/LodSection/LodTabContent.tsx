import { Label, RangeWrapper } from "./LodTabs.style";
import { StyledRange } from "../../../../../common/StyledRange";
import { ContentWrapper } from "../ModelPreview.style";
import { LodSettings } from '../types';

type LodTabContentProps = {
    lodSettings: LodSettings;
    setLodSettings: (settings: LodSettings) => void;
};

export const LodTabContent = ({
    lodSettings,
    setLodSettings,
} : LodTabContentProps) => {
    const updateSetting = (key: keyof LodSettings, value: number) => {
        setLodSettings({
            ...lodSettings,
            [key]: value,
        });
    };

    const ranges: {
        label: string;
        value: number;
        key: keyof LodSettings;
    }[] = [
        {
            label: `Vertex Retention (${lodSettings.vertexRetention}% Verts)`,
            value: lodSettings.vertexRetention,
            key: "vertexRetention",
        },
        {
            label: `Texture Scale (${lodSettings.textureScale}% Size)`,
            value: lodSettings.textureScale,
            key: "textureScale",
        },
    ];

    return (
        <ContentWrapper>
            {ranges.map(({ label, value, key }) => 
                <RangeWrapper key={key}>
                    <Label>{label} {Number(value).toFixed(2)}</Label>
                    <StyledRange
                        value={value}
                        setValue={(v) => updateSetting(key, v)}
                        min={5}
                        max={100}
                        step={5}
                    />
                </RangeWrapper>,
            )}
        </ContentWrapper>
    );
};
