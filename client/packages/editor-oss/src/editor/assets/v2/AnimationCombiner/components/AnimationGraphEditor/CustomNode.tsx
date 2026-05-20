import React from "react";
import {Handle, Position, useReactFlow} from "reactflow";
import styled from "styled-components";

const CustomNodeContainer = styled.div<{$isSelected?: boolean; $isCurrent?: boolean}>`
    padding: 10px;
    background: ${props =>
        props.$isCurrent
            ? "linear-gradient(90deg, #2a3a2a 0%, #2a4a3a 100%)" // greenish tint for current node
            : props.$isSelected
              ? "#3a3a3a"
              : "#2a2a2a"};
    border-radius: 5px;
    border: 1px solid
        ${props =>
            props.$isCurrent ? "var(--theme-green, #4CAF50)" : props.$isSelected ? "var(--theme-blue)" : "#444"};
    min-width: 120px;
    text-align: center;
    color: white;
    transition: all 0.2s ease;
    box-shadow: ${props =>
        props.$isCurrent
            ? "0 0 16px 2px rgba(76, 175, 80, 0.25)"
            : props.$isSelected
              ? "0 0 10px rgba(0, 150, 255, 0.3)"
              : "none"};
    position: relative;
`;

const CustomHandle = styled(Handle)`
    width: calc(100% + 10px);
    height: calc(100% + 10px);
    background: transparent;
    position: absolute;
    border-radius: 8px;
    border: 1px dashed transparent;
    opacity: 1;
    transition: all 0.2s ease;
    cursor: crosshair;

    &:hover {
        background: rgba(0, 150, 255, 0.1);
        border-color: var(--theme-blue);
    }
`;

const NodeContent = styled.div`
    position: relative;
    z-index: 2;
    cursor: move;
    padding: 8px;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.05);
    margin: -8px;
    user-select: none;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

export const CustomNode = ({data, selected, id}: {data: any; selected?: boolean; id: string}) => {
    const {getNode} = useReactFlow();
    const node = getNode(id);
    const isConnecting = node?.selected;

    const handleNodeDragStart = (event: React.DragEvent) => {
        if (isConnecting) {
            event.preventDefault();
            event.stopPropagation();
        }
    };

    return (
        <CustomNodeContainer $isSelected={selected}
            $isCurrent={data.isCurrent}
        >
            <CustomHandle
                id={`right-${id}`}
                position={Position.Right}
                type="source"
                style={{right: -4, top: "50%", transform: "translateY(-50%)"}}
            />
            {(!isConnecting || !node?.selected) && 
                <CustomHandle
                    id={`left-${id}`}
                    position={Position.Left}
                    type="target"
                    isConnectableStart={false}
                    style={{left: -4, top: "50%", transform: "translateY(-50%)"}}
                />
            }
            <NodeContent onDragStart={handleNodeDragStart}>
                <div style={{fontWeight: "bold"}}>{data.label}</div>
                {/* {data.isCurrent && <div style={{ color: '#4CAF50', fontSize: 12, marginTop: 2 }}>Current</div>} */}
            </NodeContent>
        </CustomNodeContainer>
    );
};
