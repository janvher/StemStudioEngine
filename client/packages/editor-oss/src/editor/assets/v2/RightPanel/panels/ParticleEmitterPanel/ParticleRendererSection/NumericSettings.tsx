import { ParticleSystem } from "three.quarks";

import { NumericInputRow } from "../../../common/NumericInputRow";

interface Props {
    particleSystem: ParticleSystem;
    updateProperties: () => void
}

export const NumericSettings = ({ updateProperties, particleSystem }: Props) => {

    const onChangeUTileCount = (u: number) => {
        particleSystem.uTileCount = u;
        updateProperties();
    };

    const onChangeVTileCount = (v: number) => {
        particleSystem.vTileCount = v;
        updateProperties();
    };

    const onChangeRenderOrder = (order: number) => {
        particleSystem.renderOrder = order;
        updateProperties();
    };

    // --- Opacity ---
    const onOpacityChange = (value: number) => {
        if (!particleSystem.material) return;
        particleSystem.material.opacity = value;
        if (value < 1) particleSystem.material.transparent = true;
        updateProperties();
    };

    const numericInputs = [
        {
            label: "Opacity",
            value: particleSystem.material?.opacity ?? 1,
            setValue: onOpacityChange,
            width: undefined,
        },
        {
            label: "Render Order",
            value: particleSystem.renderOrder,
            setValue: onChangeRenderOrder,
            width: undefined,
        },
        {
            label: "UV Tile Column",
            value: particleSystem.uTileCount,
            setValue: onChangeUTileCount,
            width: "60px",
        },
        {
            label: "UV Tile Row",
            value: particleSystem.vTileCount,
            setValue: onChangeVTileCount,
            width: "60px",
        },
    ];

    return (
        <>
            {numericInputs.map((input, index) => 
                <NumericInputRow
                    key={index}
                    label={input.label}
                    value={input.value}
                    setValue={input.setValue}
                    $margin="0 0 8px 0"
                    width={input.width}
                />,
            )}
        </>
    );

};
