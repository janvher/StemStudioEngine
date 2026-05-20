import React, {useEffect, useState} from "react";
import ReactGradientPicker from "react-best-gradient-color-picker";
import styled from "styled-components";
import {Gradient, Vector3} from "three.quarks";
import {useOnClickOutside} from "usehooks-ts";

interface GradientPickerProps {
    value: Gradient;
    setValue: (gradient: Gradient) => void;
    disabled?: boolean;
    width?: number;
}

const GradientPreview = styled.div<{$gradient: string; $width?: number}>`
    width: ${({$width}) => $width || 80}px;
    height: 24px;
    border-radius: 8px;
    background: ${({$gradient}) => $gradient};
    border: 1px solid rgba(255, 255, 255, 0.1)
    cursor: pointer;
    transition: border-color 0.2s ease;

    &:hover {
        border-color: var(--theme-font-main-selected-color, #fff);
    }
`;

const StyledGradientPicker = styled.div`
   position: fixed;
    z-index: 1001;
    right: 264px;
    top: 50%;
    transform: translateY(-50%);
    margin-top: 4px;
    padding: 12px;
    background: var(--theme-container-main-dark, #2a2a2a);
    border: 1px solid rgba(255, 255, 255, 0.1)
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);

    .gradient-picker {
        background: transparent !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 8px !important;
    }

    #rbgcp-gradient-controls-wrap-dark > div:first-child {
    display: none !important;
}

    .stop {
        border: 2px solid rgba(35, 27, 27, 0.1) !important;
    }

    .stop.active {
        border-color: var(--theme-font-main-selected-color, #fff) !important;
    }
`;

export const GradientPicker: React.FC<GradientPickerProps> = ({value, setValue, disabled = false, width}) => {
    const [open, setOpen] = useState(false);
    const [editingGradient, setEditingGradient] = useState<string>("");
    const [gradientType, setGradientType] = useState<"linear" | "radial">("linear");
    const [angle, setAngle] = useState(90);

    const pickerRef = React.useRef<any>(null);

    useOnClickOutside(pickerRef, () => {
        if (open) {
            setOpen(false);
        }
    });

    const extractGradientType = (css: string) => {
        if (css.startsWith("radial")) return "radial";
        return "linear";
    };

    const extractAngle = (css: string) => {
        const match = css.match(/(\d+)deg/);
        return match ? parseInt(match[1] || "90") : 90;
    };

    // Convert Gradient to CSS gradient string expected by react-best-gradient-color-picker
    const colorKeys = value.color.keys;
    const alphaKeys = value.alpha.keys;

    const gradientStops = colorKeys.map(colorKey => {
        // Find corresponding alpha value for this position
        const alphaKey = alphaKeys.find(ak => Math.abs(ak[1] - colorKey[1]) < 0.01) || alphaKeys[0];
        const alpha = alphaKey ? alphaKey[0] : 1;

        const color = colorKey[0];
        const r = color.x !== undefined ? Math.round(color.x * 255) : 0;
        const g = color.y !== undefined ? Math.round(color.y * 255) : 0;
        const b = color.z !== undefined ? Math.round(color.z * 255) : 0;

        return `rgba(${r}, ${g}, ${b}, ${alpha}) ${colorKey[1] * 100}%`;
    });

    // Generate CSS gradient for both preview and picker
    const gradientCSS = React.useMemo(() => {
        const type = gradientType === "radial" ? "radial-gradient" : "linear-gradient";

        const anglePart = gradientType === "linear" ? `${angle}deg,` : "";

        return `${type}(${anglePart} ${gradientStops.join(", ")})`;
    }, [gradientStops, gradientType, angle]);

    useEffect(() => {
        if (open) {
            setEditingGradient(gradientCSS);
            setGradientType(extractGradientType(gradientCSS));
            setAngle(extractAngle(gradientCSS));
        }
    }, [open]);

    const onGradientChange = (newGradient: string) => {
        const type = extractGradientType(newGradient);
        const angle = extractAngle(newGradient);

        setGradientType(type);
        setAngle(angle);

        // Parse the gradient string to extract colors and positions
        // const matches = newGradient.match(/rgba?\([\d\s,.]+\)\s*\d*%?/g);
        const matches = newGradient.match(/rgba?\([^)]+\)\s*\d*%?/gi);
        if (!matches) return;

        const colors: [Vector3, number][] = [];
        const alphas: [number, number][] = [];

        matches.forEach(match => {
            const rgbaMatch = match.match(/rgba?\(([^)]+)\)\s*(\d*\.?\d*)?/i);

            if (!rgbaMatch) return;

            const values = rgbaMatch[1]?.split(",").map(v => parseFloat(v.trim()));

            if (!values) return;

            const position = rgbaMatch[2] ? parseFloat(rgbaMatch[2]) / 100 : 0;
            const r = (values[0] || 0) / 255;
            const g = (values[1] || 0) / 255;
            const b = (values[2] || 0) / 255;
            const a = values[3] !== undefined ? values[3] : 1;

            colors.push([new Vector3(r, g, b), position]);
            alphas.push([a, position]);
        });
        colors.sort((a, b) => a[1] - b[1]);
        alphas.sort((a, b) => a[1] - b[1]);
        if (colors.length > 0) {
            const newGradientObj = new Gradient(colors, alphas);
            setValue(newGradientObj);
        }
    };

    return (
        <div style={{position: "relative"}}>
            <GradientPreview $gradient={gradientCSS} $width={width} onClick={() => !disabled && setOpen(true)} />
            {open && (
                <StyledGradientPicker ref={pickerRef}>
                    <ReactGradientPicker
                        value={editingGradient}
                        onChange={g => {
                            setEditingGradient(g);
                            onGradientChange(g);
                        }}
                        hideGradientAngle
                        hideGradientType
                    />
                </StyledGradientPicker>
            )}
        </div>
    );
};
