import React from "react";
import {getStraightPath, Node} from "reactflow";

import {getEdgeParams} from "./edgeUtils";

interface CustomConnectionLineProps {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    connectionLineStyle?: React.CSSProperties;
    sourceNode?: Node;
    targetNode?: Node;
}

/**
 *
 * @param root0
 * @param root0.fromX
 * @param root0.fromY
 * @param root0.toX
 * @param root0.toY
 * @param root0.connectionLineStyle
 * @param root0.sourceNode
 * @param root0.targetNode
 */
function CustomConnectionLine({
    fromX,
    fromY,
    toX,
    toY,
    connectionLineStyle,
    sourceNode,
    targetNode,
}: CustomConnectionLineProps) {
    let path = "";

    if (sourceNode && targetNode) {
        const {sx, sy, tx, ty} = getEdgeParams(sourceNode, targetNode);
        const [edgePath] = getStraightPath({
            sourceX: sx,
            sourceY: sy,
            targetX: tx,
            targetY: ty,
        });
        path = edgePath;
    } else {
        const [edgePath] = getStraightPath({
            sourceX: fromX,
            sourceY: fromY,
            targetX: toX,
            targetY: toY,
        });
        path = edgePath;
    }

    return (
        <g>
            <path
                style={{
                    ...connectionLineStyle,
                    stroke: "#666",
                    strokeWidth: 2,
                }}
                fill="none"
                d={path}
            />
        </g>
    );
}

export default CustomConnectionLine;
