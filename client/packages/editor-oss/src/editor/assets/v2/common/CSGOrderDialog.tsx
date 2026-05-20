import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import React, { useState } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import * as THREE from "three";

import {useEscapeDismiss} from "./hooks/useEscapeDismiss";
import {ModalBackdrop} from "./ModalBackdrop";
import { flexCenter } from "../../../../assets/style";
import { CSGOperation } from "@stem/editor-oss/command/Commands";
import i18n from "@stem/editor-oss/i18n/config";
import x from "../AssetsLibrary/images/x.svg";

const NAV_HEIGHT = "56px";

const Container = styled.div`
    position: fixed;
    z-index: 10000;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 600px;
    max-height: 80vh;
    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
`;

const Nav = styled.div`
    color: white;
    width: 100%;
    height: ${NAV_HEIGHT};
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--theme-container-divider);
    font-size: 14px;
    font-weight: 500;
`;

const Content = styled.div`
    color: white;
    ${flexCenter};
    width: 100%;
    height: calc(100% - ${NAV_HEIGHT});
    justify-content: flex-start;
    align-items: flex-start;
    padding: 16px;
    flex-direction: column;
    overflow: hidden;
    gap: 16px;
`;

const InfoBox = styled.div`
    padding: 12px;
    background: rgba(255, 107, 157, 0.1);
    border: 1px solid rgba(255, 107, 157, 0.3);
    border-radius: 8px;
    font-size: 13px;
    color: var(--theme-font-main-color);
    line-height: 1.5;
`;

const OperationLabel = styled.div`
    font-size: 14px;
    margin-bottom: 8px;
    color: var(--theme-font-main-selected-color);
`;

const ShapesList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-height: 320px;
    overflow-y: auto;
`;

const ShapeItem = styled.div<{ $isDragging: boolean }>`
    padding: 10px 12px;
    background: ${props => props.$isDragging ? "rgba(255, 107, 157, 0.2)" : "var(--theme-grey-bg)"};
    border: 1px solid ${props => props.$isDragging ? "rgba(255, 107, 157, 0.5)" : "transparent"};
    border-radius: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: grab;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(255, 107, 157, 0.15);
        border-color: rgba(255, 107, 157, 0.5);
    }

    &:active {
        cursor: grabbing;
    }
`;

const ShapeIndex = styled.div`
    width: 24px;
    height: 24px;
    background: rgba(255, 107, 157, 0.3);
    border-radius: 50%;
    ${flexCenter};
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
`;

const ShapeName = styled.div`
    flex: 1;
    color: var(--theme-font-main-selected-color);
    font-size: 14px;
`;

const ShapeType = styled.div`
    font-size: 13px;
    color: var(--theme-font-main-color);
    opacity: 0.7;
`;

const DragHandle = styled.div`
    width: 20px;
    height: 20px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 3px;
    opacity: 0.5;

    &::before,
    &::after {
        content: "";
        width: 100%;
        height: 2px;
        background: currentColor;
        border-radius: 1px;
    }
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
    width: 100%;
    justify-content: flex-end;
    margin-top: auto;
    padding-top: 8px;

    button {
        padding: 8px 16px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:first-child {
            background: transparent;
            border: 1px solid var(--theme-container-stroke-color);
            color: white;

            &:hover {
                background: var(--theme-grey-bg);
            }
        }

        &:last-child {
            background: #22c55e;
            color: white;

            &:hover {
                background: #16a34a;
            }
        }
    }
`;

interface Props {
    objects: THREE.Object3D[];
    operation: CSGOperation;
    onConfirm: (orderedObjects: THREE.Object3D[]) => void;
    onCancel: () => void;
}

export const CSGOrderDialog: React.FC<Props> = ({ objects, operation, onConfirm, onCancel }) => {
    console.log("CSGOrderDialog component instantiated!", { objects, operation });
    const [orderedObjects, setOrderedObjects] = useState<THREE.Object3D[]>([...objects]);
    useEscapeDismiss({onEscape: onCancel});

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(orderedObjects);
        const reorderedItem = items.splice(result.source.index, 1)[0] as THREE.Object3D;
        items.splice(result.destination.index, 0, reorderedItem);

        setOrderedObjects(items);
    };

    const getOperationDescription = () => {
        switch (operation) {
            case CSGOperation.UNION:
                return i18n.t("Union combines all shapes. Order doesn't affect the final result.");
            case CSGOperation.INTERSECTION:
                return i18n.t("Intersection keeps only the overlapping parts. The first shape is the base.");
            case CSGOperation.DIFFERENCE:
                return i18n.t("Difference subtracts shapes from the first one. Order is critical: Shape 1 - Shape 2 - Shape 3...");
            default:
                return "";
        }
    };

    const getGeometryType = (obj: THREE.Object3D): string => {
        if (obj instanceof THREE.Mesh && obj.geometry) {
            return obj.geometry.type.replace("Geometry", "");
        }
        return i18n.t("Unknown");
    };

    console.log("CSGOrderDialog rendering with portal");
    return ReactDOM.createPortal(
        <ModalBackdrop $zIndex={9999} onClick={onCancel}>
            <Container onClick={e => e.stopPropagation()}>
                <Nav>
                    <span>{i18n.t("CSG Operation: {{operation}}", {operation: operation.charAt(0).toUpperCase() + operation.slice(1)})}</span>
                    <button className="reset-css"
                        style={{ cursor: "pointer" }}
                        onClick={onCancel}
                    >
                        <img src={x}
                            alt={i18n.t("close")}
                        />
                    </button>
                </Nav>
                <Content>
                <InfoBox>
                    <strong>{operation.toUpperCase()}</strong>: {getOperationDescription()}
                </InfoBox>

                <OperationLabel>
                    {i18n.t("Drag and drop to reorder shapes ({{count}} shapes):", {count: orderedObjects.length})}
                </OperationLabel>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="csg-shapes">
                        {(provided) => 
                            <ShapesList
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {orderedObjects.map((obj, index) => 
                                    <Draggable
                                        key={obj.uuid}
                                        draggableId={obj.uuid}
                                        index={index}
                                    >
                                        {(provided, snapshot) => 
                                            <ShapeItem
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                $isDragging={snapshot.isDragging}
                                            >
                                                <ShapeIndex>{index + 1}</ShapeIndex>
                                                <ShapeName>{obj.name || i18n.t("Unnamed")}</ShapeName>
                                                <ShapeType>{getGeometryType(obj)}</ShapeType>
                                                <DragHandle />
                                            </ShapeItem>
                                        }
                                    </Draggable>,
                                )}
                                {provided.placeholder}
                            </ShapesList>
                        }
                    </Droppable>
                </DragDropContext>

                    <ButtonRow>
                        <button onClick={onCancel}>
                            {i18n.t("Cancel")}
                        </button>
                        <button onClick={() => onConfirm(orderedObjects)}>
                            {i18n.t("Apply {{operation}}", {operation: operation.charAt(0).toUpperCase() + operation.slice(1)})}
                        </button>
                    </ButtonRow>
                </Content>
            </Container>
        </ModalBackdrop>,
        document.body,
    );
};
