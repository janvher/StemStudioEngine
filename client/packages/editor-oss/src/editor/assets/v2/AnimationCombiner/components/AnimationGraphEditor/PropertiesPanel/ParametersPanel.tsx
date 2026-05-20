import {DragDropContext, Droppable, Draggable, DropResult} from "@hello-pangea/dnd";
import React, {Dispatch, SetStateAction, useCallback, useRef} from "react";

import {selectInputWidth} from "./constants";
import {ParamType} from "./PanelRenderer";
import {Title, DraggableParam} from "./style";
import {AnimationParameter, IAnimationGraph} from "../../../../../../../animation";
import {showToast} from "@stem/editor-oss/showToast";
import {StyledButton} from "../../../../common/StyledButton";
import {Tooltip} from "../../../../common/Tooltip";
import {NumericInputRow} from "../../../../RightPanel/common/NumericInputRow";
import {PanelCheckbox} from "../../../../RightPanel/common/PanelCheckbox";
import {SelectRow} from "../../../../RightPanel/common/SelectRow";
import {Separator} from "../../../../RightPanel/common/Separator";
import {TextInputRow} from "../../../../RightPanel/common/TextInputRow";
import trashIcon from "../../../assets/trash.svg";

interface Props {
    animationGraph: IAnimationGraph;
    onGraphChange: (graph: IAnimationGraph) => void;
    newParamName: string;
    setNewParamName: Dispatch<SetStateAction<string>>;
    newParamType: ParamType;
    setNewParamType: Dispatch<SetStateAction<ParamType>>;
    onAddParameter: (name: string, type: ParamType, defaultValue: number | boolean) => void;
    newParamDefault?: number | boolean;
    setNewParamDefault: Dispatch<SetStateAction<number | boolean | undefined>>;
    onRemoveParameter: (name: string) => void;
}

export const ParametersPanel = ({
    animationGraph,
    newParamName,
    setNewParamName,
    newParamType,
    setNewParamType,
    newParamDefault,
    setNewParamDefault,
    onGraphChange,
    onAddParameter,
    onRemoveParameter,
}: Props) => {
    // Anchor for placing tooltips to the left of the whole panel
    const panelAnchorRef = useRef<HTMLDivElement>(null);
    const panelAnchorRefAsHTMLElement = panelAnchorRef as React.RefObject<HTMLElement>;

    const onDragEnd = useCallback(
        (result: DropResult) => {
            if (!animationGraph) return;
            const {source, destination} = result;
            if (!destination) return;
            if (source.index === destination.index && source.droppableId === destination.droppableId) return;
            // Reorder in the underlying graph (Map preserves insertion order)
            animationGraph.reorderParameters(source.index, destination.index);
            onGraphChange(animationGraph);
        },
        [animationGraph, onGraphChange],
    );

    if (!animationGraph) return null;
    const parameters: AnimationParameter[] = Array.from(animationGraph.getParameters().values());
    const handleAddParameter = () => {
        if (!newParamName.trim()) return;
        if (animationGraph.getParameter(newParamName)) {
            showToast({type: "error", title: "Parameter name already exists"});
            return;
        }
        let defaultValue: number | boolean | undefined = newParamDefault;
        if (newParamType === "float" || newParamType === "int") {
            defaultValue = newParamDefault || 0;
        } else if (newParamType === "bool") {
            defaultValue = Boolean(newParamDefault);
        } else {
            // trigger: no default value UI; keep internal default as false
            defaultValue = false;
        }

        if (onAddParameter) {
            onAddParameter(newParamName, newParamType, defaultValue);
        } else {
            animationGraph.addParameter(newParamName, newParamType, defaultValue);
            onGraphChange(animationGraph);
            setNewParamName("");
            setNewParamType("float");
            setNewParamDefault(undefined);
        }
    };

    const handleRemoveParameter = (paramName: string) => {
        if (onRemoveParameter) {
            onRemoveParameter(paramName);
        } else {
            animationGraph.getParameters().delete(paramName);
            onGraphChange(animationGraph);
        }
    };

    return (
        <div ref={panelAnchorRef}
            style={{position: "relative"}}
        >
            <Title style={{marginTop: 0}}>Create New:</Title>
            <TextInputRow
                label="Name"
                value={newParamName}
                setValue={value => setNewParamName(value)}
                labelTooltip={<div style={{lineHeight: 1.25}}>Unique identifier for the parameter.</div>}
                anchorRef={panelAnchorRefAsHTMLElement}
            />
            <SelectRow
                data={[
                    {key: "float", value: "float"},
                    {key: "int", value: "int"},
                    {key: "bool", value: "bool"},
                    {key: "trigger", value: "trigger"},
                ]}
                value={{key: newParamType, value: newParamType}}
                onChange={item => setNewParamType(item.value as ParamType)}
                label="Param Type"
                noPortal
                width={selectInputWidth}
                labelTooltip={
                    <div style={{lineHeight: 1.25}}>
                        Parameter kind: numeric (float/int), boolean, or trigger (one-shot).
                    </div>
                }
                anchorRef={panelAnchorRefAsHTMLElement}
            />

            {newParamType === "float" || newParamType === "int" ? 
                <NumericInputRow
                    label="Default"
                    value={typeof newParamDefault === "number" ? newParamDefault : 0}
                    setValue={value => setNewParamDefault(newParamType === "int" ? Math.trunc(value) : value)}
                    labelTooltip={
                        <div style={{lineHeight: 1.25}}>Initial numeric value used when the graph loads.</div>
                    }
                    anchorRef={panelAnchorRefAsHTMLElement}
                />
             : newParamType === "bool" ? 
                <SelectRow
                    data={[
                        {key: "true", value: "true"},
                        {key: "false", value: "false"},
                    ]}
                    value={{key: newParamDefault ? "true" : "false", value: newParamDefault ? "true" : "false"}}
                    onChange={item => setNewParamDefault(item.value === "true")}
                    label="Default"
                    noPortal
                    width={selectInputWidth}
                    labelTooltip={
                        <div style={{lineHeight: 1.25}}>Initial boolean value used when the graph loads.</div>
                    }
                    anchorRef={panelAnchorRefAsHTMLElement}
                />
             : null}
            <StyledButton isBlue
                onClick={handleAddParameter}
                disabled={!newParamName}
            >
                Add +
            </StyledButton>
            <Separator margin="12px 0 8px" />
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="parameters-list">
                    {dropProvided => 
                        <div ref={dropProvided.innerRef}
                            {...dropProvided.droppableProps}
                        >
                            {parameters.map((param, index) => 
                                <React.Fragment key={param.name}>
                                    <Draggable draggableId={param.name}
                                        index={index}
                                    >
                                        {dragProvided => 
                                            <div ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                            >
                                                <DraggableParam {...dragProvided.dragHandleProps}>
                                                    <Title>
                                                        {param.name}
                                                        <button
                                                            className="reset-css"
                                                            onClick={() => handleRemoveParameter(param.name)}
                                                        >
                                                            <img src={trashIcon}
                                                                alt="remove"
                                                            />
                                                        </button>
                                                    </Title>
                                                    {/* Default (serialized) value editor */}
                                                    {param.type === "bool" ? 
                                                        <PanelCheckbox
                                                            text="Default Value"
                                                            checked={!!param.defaultValue}
                                                            id={`${param.name}-default`}
                                                            onChange={e => {
                                                                const p = animationGraph.getParameter(param.name);
                                                                if (p) p.defaultValue = e.target.checked;
                                                                onGraphChange(animationGraph);
                                                            }}
                                                        />
                                                     : 
                                                        (param.type === "int" || param.type === "float") && 
                                                            <NumericInputRow
                                                                label="Default Value"
                                                                value={
                                                                    typeof param.defaultValue === "number"
                                                                        ? param.defaultValue
                                                                        : 0
                                                                }
                                                                setValue={value => {
                                                                    const p = animationGraph.getParameter(param.name);
                                                                    if (p)
                                                                        p.defaultValue =
                                                                            param.type === "int"
                                                                                ? Math.trunc(value)
                                                                                : value;
                                                                    onGraphChange(animationGraph);
                                                                }}
                                                                labelTooltip={
                                                                    <div style={{lineHeight: 1.25}}>
                                                                        Serialized initial value saved with the graph.
                                                                    </div>
                                                                }
                                                                anchorRef={panelAnchorRefAsHTMLElement}
                                                            />
                                                        
                                                    }

                                                    {/* Current (runtime) value editor */}
                                                    {param.type === "bool" ? 
                                                        <PanelCheckbox
                                                            text="Current Value"
                                                            checked={!!param.value}
                                                            id={`${param.name}-current`}
                                                            onChange={e => {
                                                                animationGraph.setParameter(
                                                                    param.name,
                                                                    e.target.checked,
                                                                );
                                                                onGraphChange(animationGraph);
                                                            }}
                                                        />
                                                     : param.type === "trigger" ? 
                                                        <StyledButton
                                                            isBlue
                                                            onClick={() => {
                                                                animationGraph.setParameter(param.name, true);
                                                                onGraphChange(animationGraph);
                                                            }}
                                                        >
                                                            Trigger
                                                        </StyledButton>
                                                     : 
                                                        <NumericInputRow
                                                            label="Current Value"
                                                            value={
                                                                typeof param.value === "number"
                                                                    ? param.value
                                                                    : typeof param.defaultValue === "number"
                                                                      ? param.defaultValue
                                                                      : 0
                                                            }
                                                            setValue={value => {
                                                                animationGraph.setParameter(
                                                                    param.name,
                                                                    param.type === "int" ? Math.trunc(value) : value,
                                                                );
                                                                onGraphChange(animationGraph);
                                                            }}
                                                            labelTooltip={
                                                                <div style={{lineHeight: 1.25}}>
                                                                    Live runtime value used for evaluations.
                                                                </div>
                                                            }
                                                            anchorRef={panelAnchorRefAsHTMLElement}
                                                        />
                                                    }
                                                </DraggableParam>
                                            </div>
                                        }
                                    </Draggable>
                                </React.Fragment>,
                            )}
                            {dropProvided.placeholder}
                        </div>
                    }
                </Droppable>
            </DragDropContext>
        </div>
    );
};
