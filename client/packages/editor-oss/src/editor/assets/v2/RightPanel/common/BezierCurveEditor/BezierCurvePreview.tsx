 
import React from "react";
import styled from "styled-components";
import {PiecewiseBezier, Bezier} from "three.quarks";

import global from "@stem/editor-oss/global";

interface BezierCurvePreviewProps {
    value: PiecewiseBezier;
    width: number;
    height: number;
    background?: string;
    curveColor?: string;
    curveWidth?: number;
    onChange?: (value: PiecewiseBezier) => void;
}

const PreviewContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const CurveComponent: React.FC<{
    xFrom: number;
    xTo: number;
    yFrom: number;
    yTo: number;
    curveColor: string;
    curveWidth: number;
    value: Bezier;
}> = ({xFrom, xTo, yFrom, yTo, curveColor, curveWidth, value}) => {
    const points = [];
    const steps = Math.max(10, Math.abs(xTo - xFrom));

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = xFrom + (xTo - xFrom) * t;
        const y = yFrom + (yTo - yFrom) * value.genValue(t);
        points.push(`${x},${y}`);
    }

    return <polyline points={points.join(" ")}
        fill="none"
        stroke={curveColor}
        strokeWidth={curveWidth}
           />;
};

export const BezierCurvePreview: React.FC<BezierCurvePreviewProps> = ({
    value,
    width,
    height,
    curveWidth = 1,
    curveColor = "#000",
    background = "#dddddd",
    onChange,
}) => {
    const viewBox = `0 ${-height} ${width} ${height}`;

    const curves = [];
    for (let i = 0; i < value.numOfFunctions; i++) {
        const x1 = value.getStartX(i);
        const x2 = value.getEndX(i);
        const curve = value.getFunction(i);

        curves.push(
            <g key={i}>
                <CurveComponent
                    xFrom={x1 * width}
                    xTo={x2 * width}
                    yFrom={0}
                    yTo={-height}
                    curveColor={curveColor}
                    curveWidth={curveWidth}
                    value={curve}
                />
            </g>,
        );
    }

    const handleEdit = () => {
        const app = global.app;
        if (app?.editor?.component?.openBezierCurveEditor) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (app.editor.component as any).openBezierCurveEditor(value, (newValue: PiecewiseBezier) => {
                if (onChange) {
                    onChange(newValue);
                }
            });
        }
    };

    return (
        <PreviewContainer onClick={handleEdit}
            style={{cursor: "pointer"}}
        >
            <svg width={width}
                height={height}
                viewBox={viewBox}
                style={{backgroundColor: background}}
            >
                {curves}
            </svg>
        </PreviewContainer>
    );
};
