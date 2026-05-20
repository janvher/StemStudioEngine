import {DragDropContext, Droppable, Draggable, DropResult} from "@hello-pangea/dnd";
import {useRef} from "react";
import * as THREE from "three";

import {AttributesWrapper, Wrapper} from "./AttributesSection.style";
import {SingleAttribute} from "./SingleAttribute";
import BehaviorAttributeType from "../../../../../../editor/behaviors/BehaviorAttributeType";
import {StyledButton} from "../../../common/StyledButton";
import {IAttribute} from "../types";

interface Props {
    attributes: IAttribute[];
    setAttributes: (attributes: IAttribute[]) => void;
    hideNameField?: boolean;
    label?: string;
}

export const AttributesSection = ({attributes, setAttributes, hideNameField, label}: Props) => {
    const attributesWrapperRef = useRef<HTMLDivElement>(null);
    const createNewAttribute = () => {
        let newAttributeName = "Attribute1";

        const existingKeys = attributes.map(attr => attr.key || "");

        if (existingKeys.length > 0) {
            const highestNum = existingKeys
                .map(key => {
                    const match = key.match(/^Attribute(\d+)$/);
                    return match ? parseInt(match[1] as string) : 0;
                })
                .reduce((max, num) => Math.max(max, num), 0);

            newAttributeName = `Attribute${highestNum + 1}`;
            setTimeout(() => {
                if (attributesWrapperRef.current) {
                    attributesWrapperRef.current.scrollTo({
                        top: attributesWrapperRef.current.scrollHeight,
                        behavior: "smooth",
                    });
                }
            }, 0);
        }

        const newAttr: IAttribute = {
            id: THREE.MathUtils.generateUUID(),
            key: newAttributeName,
            name: newAttributeName,
            type: BehaviorAttributeType.String,
            array: false,
            default: "",
            invisible: false,
            userVisible: true,
            order: existingKeys.length,
        };

        setAttributes([...attributes, newAttr]);
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const updated = Array.from(attributes);
        const [movedItem] = updated.splice(result.source.index, 1);
        if (!movedItem) return;
        updated.splice(result.destination.index, 0, movedItem);

        const reordered = updated.map(
            (attr, index) =>
                ({
                    ...attr,
                    order: index,
                }),
        );

        setAttributes(reordered);
    };

    return (
        <Wrapper
            style={{minHeight: attributes.length > 0 ? "170px" : "60px"}}
            className="AttributesSection"
        >
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="attributes">
                    {provided => (
                        <AttributesWrapper
                            ref={el => {
                                provided.innerRef(el);
                                attributesWrapperRef.current = el;
                            }}
                            {...provided.droppableProps}
                        >
                            {attributes.map((attribute, index) => (
                                <Draggable
                                    draggableId={attribute.key}
                                    index={index}
                                    key={attribute.key}
                                >
                                    {(provided, snapshot) => {
                                        return (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                                    marginBottom: "8px",
                                                }}
                                            >
                                                <SingleAttribute
                                                    attributes={attributes}
                                                    attribute={attribute}
                                                    setAttributes={setAttributes}
                                                    attributeIndex={index}
                                                    dragHandleProps={provided.dragHandleProps}
                                                    hideNameField={hideNameField}
                                                />
                                            </div>
                                        );
                                    }}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </AttributesWrapper>
                    )}
                </Droppable>
            </DragDropContext>

            <StyledButton
                isGrey
                width="calc(100% - 8px)"
                onClick={createNewAttribute}
                style={attributes.length === 0 ? {marginTop: "8px"} : undefined}
            >
                {label || "Add Attribute"}
            </StyledButton>
        </Wrapper>
    );
};
