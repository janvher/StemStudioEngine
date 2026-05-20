import React from "react";
import {EdgeProps, getStraightPath} from "reactflow";

export const CustomEdge: React.FC<EdgeProps> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    style = {},
    markerEnd,
    data,
    selected,
}) => {
    const [edgePath] = getStraightPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
    });

    const enhancedStyle = {
        ...style,
        stroke: selected ? "var(--theme-blue)" : "#666",
        strokeWidth: selected ? 4 : 2,
        opacity: 1,
        cursor: "pointer",
        pointerEvents: (selected ? "none" : "auto") as React.CSSProperties["pointerEvents"],
        filter: selected ? "drop-shadow(0 0 8px rgba(0, 150, 255, 0.5))" : "none",
    };

    return (
        <g style={{pointerEvents: (selected ? "none" : "auto") as React.CSSProperties["pointerEvents"]}}>
            <path
                id={`${id}-click`}
                style={{
                    ...style,
                    stroke: "transparent",
                    strokeWidth: 32,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    cursor: "pointer",
                    pointerEvents: (selected ? "none" : "auto") as React.CSSProperties["pointerEvents"],
                }}
                className="react-flow__edge-path"
                d={edgePath}
            />
            <path id={id}
                style={enhancedStyle}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd={markerEnd}
            />
            {data?.label && 
                <g
                    transform={`translate(${(sourceX + targetX) / 2}, ${(sourceY + targetY) / 2})`}
                    style={{pointerEvents: (selected ? "none" : "auto") as React.CSSProperties["pointerEvents"]}}
                >
                    <rect
                        x={-60}
                        y={-12}
                        width={120}
                        height={24}
                        fill={selected ? "var(--theme-blue)" : "var(--theme-grey-bg-tertiary)"}
                        rx={4}
                        ry={4}
                        opacity={selected ? 0.9 : 1}
                    />
                    <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fill={selected ? "white" : "var(--theme-font-main-selected-color)"}
                        fontSize={12}
                        fontWeight={selected ? "bold" : "normal"}
                    >
                        {data.label}
                    </text>
                </g>
            }
        </g>
    );
};
