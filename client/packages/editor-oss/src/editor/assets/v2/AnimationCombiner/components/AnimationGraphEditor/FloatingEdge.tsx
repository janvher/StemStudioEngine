import React from "react";
import {BaseEdge, getStraightPath, useStore, Node, useNodes} from "reactflow";

import {getEdgeParams} from "./edgeUtils";

interface FloatingEdgeProps {
    id: string;
    source: string;
    target: string;
    markerEnd?: any;
    style?: any;
    data?: any;
    selected?: boolean;
}

/**
 *
 * @param root0
 * @param root0.id
 * @param root0.source
 * @param root0.target
 * @param root0.markerEnd
 * @param root0.style
 * @param root0.data
 * @param root0.selected
 */
export function FloatingEdge({id, source, target, markerEnd, style, data, selected}: FloatingEdgeProps) {
    const nodes = useNodes();
    const sourceNode = nodes.find(n => n.id === source);
    const targetNode = nodes.find(n => n.id === target);

    if (!sourceNode || !targetNode) {
        return null;
    }

    const {sx, sy, tx, ty} = getEdgeParams(sourceNode, targetNode);

    const [path] = getStraightPath({
        sourceX: sx,
        sourceY: sy,
        targetX: tx,
        targetY: ty,
    });

    const enhancedStyle = {
        ...style,
        stroke: selected ? "var(--theme-blue)" : style?.stroke || "#666",
        strokeWidth: selected ? 4 : style?.strokeWidth || 2,
        filter: selected ? "drop-shadow(0 0 8px rgba(0, 150, 255, 0.5))" : "none",
        pointerEvents: (selected ? "none" : "auto") as React.CSSProperties["pointerEvents"],
    };

    return (
        <g style={{pointerEvents: (selected ? "none" : "auto") as React.CSSProperties["pointerEvents"]}}>
            {!selected && 
                <path
                    d={path}
                    className="react-flow__edge-path"
                    style={{
                        stroke: "transparent",
                        strokeWidth: 32,
                        strokeLinecap: "round",
                        strokeLinejoin: "round",
                        cursor: "pointer",
                    }}
                />
            }
            <BaseEdge id={id}
                path={path}
                markerEnd={markerEnd}
                style={enhancedStyle}
            />
        </g>
    );
}
