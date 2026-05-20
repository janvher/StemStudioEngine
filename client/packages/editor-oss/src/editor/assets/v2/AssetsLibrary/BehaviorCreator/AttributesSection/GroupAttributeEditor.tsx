import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import React, { useState, useCallback } from "react";
import * as THREE from "three";

import { Title } from "./AttributesSection.style";
import { SingleAttribute } from "./SingleAttribute";
import BehaviorAttributeType from "../../../../../../editor/behaviors/BehaviorAttributeType";
import { StyledButton } from "../../../common/StyledButton";
import { IAttribute } from "../types";

interface GroupAttributeEditorProps {
    attribute: IAttribute;
    attributeIndex: number;
    attributes: IAttribute[];
    setAttributes: (attributes: IAttribute[]) => void;
    nestingLevel?: number;
}

export const GroupAttributeEditor: React.FC<GroupAttributeEditorProps> = ({
    attribute,
    attributeIndex,
    attributes,
    setAttributes,
    nestingLevel = 0,
}) => {
    const [nestedAttributes, setNestedAttributes] = useState<IAttribute[]>(() => {
        if (!attribute.attributes || Object.keys(attribute.attributes).length === 0) {
            return [];
        }

        return Object.entries(attribute.attributes).map(([key, attr], index) => ({
            ...(attr as IAttribute),
            key,
            order: (attr as IAttribute).order ?? index,
        })).sort((a, b) => a.order - b.order);
    });

    // Remove the problematic useEffect and keep nestedAttributes as the source of truth
    // The issue was that the parent component was overriding our changes

    const updateAttribute = useCallback((field: string, value: any) => {
        const newAttributes = [...attributes];
        newAttributes[attributeIndex] = {
            ...attributes[attributeIndex],
            [field]: value,
        } as IAttribute;
        setAttributes(newAttributes);
    }, [attributes, attributeIndex, setAttributes]);

    const handleNestedAttributesChange = useCallback((updatedNestedAttributes: IAttribute[]) => {
        setNestedAttributes(updatedNestedAttributes);

        // Convert nested attributes to the format expected by GroupAttribute
        const attributeObject = updatedNestedAttributes.reduce(
            (acc, attr, index) => {
                // Take default from the attribute itself
                const { key, ...attrWithoutKey } = attr;
                acc[attr.key] = {
                    ...attrWithoutKey,
                    order: attr.order !== undefined ? attr.order : index,
                };
                return acc;
            },
            {} as Record<string, any>,
        );

        // Update default values based on nested attributes
        const defaultValues = updatedNestedAttributes.reduce((acc, attr) => {
            acc[attr.key] = attr.default;
            return acc;
        }, {} as Record<string, any>);

        // Update both fields in one call to avoid conflicts
        const newAttributes = [...attributes];
        newAttributes[attributeIndex] = {
            ...attributes[attributeIndex],
            attributes: attributeObject,
            default: defaultValues,
        } as IAttribute;

        setAttributes(newAttributes);
    }, [attributes, attributeIndex, setAttributes]);

    const addNestedAttribute = useCallback(() => {
        let newAttributeName = "attribute1";

        const existingKeys = nestedAttributes.map(attr => attr.key || "");

        if (existingKeys.length > 0) {
            const highestNum = existingKeys
                .map(key => {
                    const match = key.match(/^attribute(\d+)$/);
                    return match ? parseInt(match[1] as string) : 0;
                })
                .reduce((max, num) => Math.max(max, num), 0);

            newAttributeName = `attribute${highestNum + 1}`;
        }

        const newAttribute: IAttribute = {
            id: THREE.MathUtils.generateUUID(),
            key: newAttributeName,
            name: "",
            type: BehaviorAttributeType.String,
            array: false,
            invisible: false,
            default: "",
            order: nestedAttributes.length,
        };

        handleNestedAttributesChange([...nestedAttributes, newAttribute]);
    }, [nestedAttributes, handleNestedAttributesChange]);

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const updated = Array.from(nestedAttributes);
        const [movedItem] = updated.splice(result.source.index, 1);
        if (!movedItem) return;
        updated.splice(result.destination.index, 0, movedItem);

        const reordered = updated.map((attr, index) => ({
            ...attr,
            order: index,
        }));

        handleNestedAttributesChange(reordered);
    };

    return (
        <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
            <div style={{
                padding: "12px",
            }}
            >
                <Title style={{ marginBottom: "12px" }}>Group Attributes</Title>

                {nestedAttributes.length === 0 ? 
                    <div style={{
                        textAlign: "center",
                        color: "#666",
                        fontSize: "11px",
                        padding: "16px",
                        marginBottom: "8px",
                    }}
                    >
                        No attributes yet. Click "Add Attribute" to create your first attribute.
                    </div>
                 : 
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId={`nested-attributes-${attribute.key}-${attributeIndex}`}>
                            {provided => 
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    style={{ marginBottom: "8px" }}
                                >
                                    {nestedAttributes.map((nestedAttr, index) => 
                                        <Draggable draggableId={nestedAttr.key}
                                            index={index}
                                            key={nestedAttr.key}
                                        >
                                            {(provided, snapshot) => 
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    style={{
                                                        ...provided.draggableProps.style,
                                                        opacity: snapshot.isDragging ? 0.8 : 1,
                                                        marginBottom: "8px",
                                                    }}
                                                >
                                                    <SingleAttribute
                                                        attributes={nestedAttributes}
                                                        attribute={nestedAttr}
                                                        attributeIndex={index}
                                                        setAttributes={handleNestedAttributesChange}
                                                        dragHandleProps={provided.dragHandleProps}
                                                        nestingLevel={nestingLevel + 1}
                                                    />
                                                </div>
                                            }
                                        </Draggable>,
                                    )}
                                    {provided.placeholder}
                                </div>
                            }
                        </Droppable>
                    </DragDropContext>
                }

                <StyledButton
                    isGrey
                    width="100%"
                    onClick={addNestedAttribute}
                >
                    Add Attribute
                </StyledButton>
            </div>
        </div>
    );
};