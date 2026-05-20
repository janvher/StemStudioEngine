import React, {useRef} from "react";
import {Edge} from "reactflow";

import {numericInputWidth, selectInputWidth} from "./constants";
import {ButtonsWrapper, ConditionWrapper, Title} from "./style";
import {IAnimationGraph, TransitionCondition} from "../../../../../../../animation/types";
import {useModelAnimationCombinerContext} from "@stem/editor-oss/context";
import {StyledButton} from "../../../../common/StyledButton";
import {Tooltip} from "../../../../common/Tooltip";
import {NumericInputRow} from "../../../../RightPanel/common/NumericInputRow";
import {PanelCheckbox} from "../../../../RightPanel/common/PanelCheckbox";
import {SelectRow} from "../../../../RightPanel/common/SelectRow";
import trashIcon from "../../../assets/trash.svg";

interface Props {
    animationGraph: IAnimationGraph;
    handleTransitionConditionChange: (
        edgeId: string,
        transitionIndex: number,
        conditionIndex: number,
        field: keyof TransitionCondition,
        value: string,
    ) => void;
    handleRemoveTransitionCondition: (edgeId: string, transitionIndex: number, conditionIndex: number) => void;
    handleAddTransitionCondition: (edgeId: string, transitionIndex?: number) => void;
    handleAddNewTransition: (edgeId: string) => void;
    handleRemoveSpecificTransition: (edgeId: string, transitionIndex: number) => void;
    onGraphChange: (graph: IAnimationGraph) => void;
    edges: Edge<any>[];
    setEdges: React.Dispatch<React.SetStateAction<Edge<any>[]>>;
}

export const TransitionPropertiesPanel = ({
    animationGraph,
    handleTransitionConditionChange,
    handleRemoveTransitionCondition,
    handleAddTransitionCondition,
    handleAddNewTransition,
    handleRemoveSpecificTransition,
    onGraphChange,
    edges,
    setEdges,
}: Props) => {
    const {setSelectedEdge, selectedEdge} = useModelAnimationCombinerContext();
    const panelAnchorRef = useRef<HTMLDivElement>(null);
    const anchorRef = panelAnchorRef as React.RefObject<HTMLElement>;
    if (!selectedEdge || !animationGraph) return null;
    const sourceId = (selectedEdge as any).source || selectedEdge.data?.sourceState;
    const targetId = (selectedEdge as any).target || selectedEdge.data?.targetState;
    const sourceState = animationGraph.getState(sourceId);
    if (!sourceState) return null;

    const transitionsToTarget: any[] =
        sourceState?.getTransitions().filter((t: any) => t.targetState.id === targetId) || [];

    const transition = sourceState.getTransitions().find((t: any) => t.targetState.id === targetId);

    if (!transition && transitionsToTarget.length === 0) return null;

    if (transitionsToTarget.length === 0 && transition) {
        const transitionsToTarget = sourceState.getTransitions().filter((t: any) => t.targetState.id === targetId);
        if (transitionsToTarget.length > 0) {
            return null;
        }
    }

    const handleRemoveEdge = () => {
        const transitions = sourceState.getTransitions();
        const transitionsToKeep = transitions.filter((t: any) => t.targetState.id !== targetId);
        sourceState.clearTransitions();
        transitionsToKeep.forEach((t: any) => sourceState.addTransition(t));

        if (setEdges) {
            setEdges(edges.filter((e: any) => e.id !== selectedEdge.id));
        }

        setSelectedEdge(null);
        onGraphChange(animationGraph);
    };

    const operatorOptions = [
        {key: "equals", value: "equals"},
        {key: "notEquals", value: "not equals"},
        {key: "greater", value: "greater"},
        {key: "less", value: "less"},
        {key: "greaterOrEqual", value: "greater or equal"},
        {key: "lessOrEqual", value: "less or equal"},
    ];

    return (
        <div ref={panelAnchorRef}
            style={{position: "relative"}}
        >
            {/* Show all transitions */}
            {transitionsToTarget.map((transition: any, transitionIndex: number) => 
                <React.Fragment key={transitionIndex}>
                    <Title>
                        Transition {transitionIndex + 1}
                        {transitionIndex > 0 && 
                            <button
                                className="reset-css"
                                onClick={() => handleRemoveSpecificTransition(selectedEdge.id, transitionIndex)}
                            >
                                <img src={trashIcon}
                                    alt="remove condition"
                                />
                            </button>
                        }
                    </Title>
                    <Tooltip
                        content={
                            <div style={{lineHeight: 1.25}}>
                                Blend-in duration when entering the target state (seconds).
                            </div>
                        }
                        stayOpenOnHover
                        maxWidth="360px"
                        placement="left-of-anchor"
                        anchorRef={anchorRef}
                        triggerFullWidth
                        offsetX={-10}
                    >
                        <div>
                            <NumericInputRow
                                width={numericInputWidth}
                                label="Fade In"
                                value={transition?.fadeInDuration || 0}
                                setValue={value => {
                                    const transitions = sourceState.getTransitions();
                                    const matching = transitions.filter((t: any) => t.targetState.id === targetId);
                                    const t = matching[transitionIndex];
                                    if (t) {
                                        t.fadeInDuration = value;
                                    }
                                    onGraphChange(animationGraph);
                                }}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip
                        content={
                            <div style={{lineHeight: 1.25}}>
                                Blend-out duration when leaving the source state (seconds).
                            </div>
                        }
                        stayOpenOnHover
                        maxWidth="360px"
                        placement="left-of-anchor"
                        anchorRef={anchorRef}
                        triggerFullWidth
                        offsetX={-10}
                    >
                        <div>
                            <NumericInputRow
                                width={numericInputWidth}
                                label="Fade Out"
                                value={transition.fadeOutDuration}
                                setValue={value => {
                                    const transitions = sourceState.getTransitions();
                                    const matching = transitions.filter((t: any) => t.targetState.id === targetId);
                                    const t = matching[transitionIndex];
                                    if (t) {
                                        t.fadeOutDuration = value;
                                    }
                                    onGraphChange(animationGraph);
                                }}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip
                        content={
                            <div style={{lineHeight: 1.25}}>
                                When enabled, this transition is eligible only after the source clip reaches Exit Time.
                            </div>
                        }
                        stayOpenOnHover
                        maxWidth="360px"
                        placement="left-of-anchor"
                        anchorRef={anchorRef}
                        triggerFullWidth
                        offsetX={-10}
                    >
                        <div style={{marginBottom: "12px"}}>
                            <PanelCheckbox
                                v2
                                text="Has Exit Time"
                                checked={!!transition.hasExitTime}
                                onChange={e => {
                                    const checked = !!e?.target?.checked;
                                    const transitions = sourceState.getTransitions();
                                    // Mutate only the chosen transition instance
                                    const matching = transitions.filter((t: any) => t.targetState.id === targetId);
                                    const t = matching[transitionIndex];
                                    if (t) {
                                        t.hasExitTime = checked;
                                    }
                                    onGraphChange(animationGraph);
                                }}
                            />
                        </div>
                    </Tooltip>
                    <Tooltip
                        content={
                            <div style={{lineHeight: 1.25}}>
                                Normalized moment the transition can fire (0=end at 1x loop, 0.5=halfway, ≥1 across
                                loops).
                            </div>
                        }
                        stayOpenOnHover
                        maxWidth="360px"
                        placement="left-of-anchor"
                        anchorRef={anchorRef}
                        triggerFullWidth
                        offsetX={-10}
                    >
                        <div>
                            <NumericInputRow
                                width={numericInputWidth}
                                label="Exit Time"
                                value={Number(transition.exitTime ?? 0)}
                                setValue={value => {
                                    const transitions = sourceState.getTransitions();
                                    const matching = transitions.filter((t: any) => t.targetState.id === targetId);
                                    const t = matching[transitionIndex];
                                    if (t) {
                                        t.exitTime = Math.max(0, value);
                                    }
                                    onGraphChange(animationGraph);
                                }}
                                min={0}
                                decimalPlaces={2}
                                disabled={!transition.hasExitTime}
                            />
                        </div>
                    </Tooltip>
                    {!transition.hasExitTime &&
                        Number(transition.exitTime ?? 0) === 0 &&
                        (transition.conditions?.length ?? 0) === 0 && 
                            <div
                                className="pcui-element font-regular desc pcui-label"
                                style={{display: "block", margin: "4px 0 8px", opacity: 0.8}}
                            >
                                Note: No Exit Time or Conditions set — transition will activate instantly.
                            </div>
                        }
                    {transition.conditions.map((condition: any, index: number) => 
                        <ConditionWrapper key={index}>
                            <Title>
                                Condition ({index + 1})
                                {index >= 0 && 
                                    <button
                                        className="reset-css"
                                        onClick={() =>
                                            handleRemoveTransitionCondition(selectedEdge.id, transitionIndex, index)
                                        }
                                    >
                                        <img src={trashIcon}
                                            alt="remove condition"
                                        />
                                    </button>
                                }
                            </Title>
                            <Tooltip
                                content={<div style={{lineHeight: 1.25}}>Graph parameter to test.</div>}
                                stayOpenOnHover
                                maxWidth="320px"
                                placement="left-of-anchor"
                                anchorRef={anchorRef}
                                triggerFullWidth
                                offsetX={-10}
                            >
                                <div>
                                    <SelectRow
                                        data={Array.from(animationGraph.getParameters().values()).map((param: any) => ({
                                            key: param.name,
                                            value: param.name,
                                        }))}
                                        value={{
                                            key: condition.parameter,
                                            value: condition.parameter,
                                        }}
                                        onChange={item =>
                                            handleTransitionConditionChange(
                                                selectedEdge.id,
                                                transitionIndex,
                                                index,
                                                "parameter",
                                                item.value,
                                            )
                                        }
                                        label="Parameter"
                                        noPortal
                                        width={selectInputWidth}
                                    />
                                </div>
                            </Tooltip>
                            <Tooltip
                                content={<div style={{lineHeight: 1.25}}>Comparison to apply.</div>}
                                stayOpenOnHover
                                maxWidth="320px"
                                placement="left-of-anchor"
                                anchorRef={anchorRef}
                                triggerFullWidth
                                offsetX={-10}
                            >
                                <div>
                                    <SelectRow
                                        data={operatorOptions}
                                        value={operatorOptions.find(op => op.key === condition.operator)}
                                        onChange={item =>
                                            handleTransitionConditionChange(
                                                selectedEdge.id,
                                                transitionIndex,
                                                index,
                                                "operator",
                                                item.key,
                                            )
                                        }
                                        label="Operator"
                                        noPortal
                                        width={selectInputWidth}
                                    />
                                </div>
                            </Tooltip>
                            {/* Value input depends on parameter type */}
                            {(() => {
                                const param = Array.from(animationGraph.getParameters().values()).find(
                                    (p: any) => p.name === condition.parameter,
                                );
                                const pType = param?.type as string | undefined;
                                if (pType === "bool" || pType === "trigger") {
                                    const boolOptions = [
                                        {key: "true", value: "true"},
                                        {key: "false", value: "false"},
                                    ];
                                    const current =
                                        String(condition.value) === "true" ? boolOptions[0] : boolOptions[1];
                                    return (
                                        <Tooltip
                                            content={<div style={{lineHeight: 1.25}}>Value to compare against.</div>}
                                            stayOpenOnHover
                                            maxWidth="320px"
                                            placement="left-of-anchor"
                                            anchorRef={anchorRef}
                                            triggerFullWidth
                                            offsetX={-10}
                                        >
                                            <div>
                                                <SelectRow
                                                    data={boolOptions}
                                                    value={current}
                                                    onChange={item =>
                                                        handleTransitionConditionChange(
                                                            selectedEdge.id,
                                                            transitionIndex,
                                                            index,
                                                            "value",
                                                            item.key,
                                                        )
                                                    }
                                                    label="Value"
                                                    noPortal
                                                    width={selectInputWidth}
                                                />
                                            </div>
                                        </Tooltip>
                                    );
                                }
                                // numeric (float/int) fallback
                                const numericVal =
                                    typeof condition.value === "number"
                                        ? condition.value
                                        : Number(condition.value ?? 0);
                                return (
                                    <Tooltip
                                        content={<div style={{lineHeight: 1.25}}>Value to compare against.</div>}
                                        stayOpenOnHover
                                        maxWidth="320px"
                                        placement="left-of-anchor"
                                        anchorRef={anchorRef}
                                        triggerFullWidth
                                        offsetX={-10}
                                    >
                                        <div>
                                            <NumericInputRow
                                                width={numericInputWidth}
                                                label="Value"
                                                value={Number.isFinite(numericVal) ? numericVal : 0}
                                                setValue={value =>
                                                    handleTransitionConditionChange(
                                                        selectedEdge.id,
                                                        transitionIndex,
                                                        index,
                                                        "value",
                                                        String(value),
                                                    )
                                                }
                                            />
                                        </div>
                                    </Tooltip>
                                );
                            })()}
                            {index + 1 === transition.conditions.length && 
                                <StyledButton
                                    width="auto"
                                    isGreySecondary
                                    onClick={() => handleAddTransitionCondition(selectedEdge.id, transitionIndex)}
                                >
                                    Add Condition +
                                </StyledButton>
                            }
                        </ConditionWrapper>,
                    )}
                    {transition.conditions.length === 0 && 
                        <ConditionWrapper>
                            <Title>Conditions</Title>
                            <div style={{fontSize: "12px", opacity: 0.8, marginBottom: 8}}>
                                No conditions — this transition is unconditional and will be taken when exit criteria
                                are met.
                            </div>
                            <StyledButton
                                width="auto"
                                isGreySecondary
                                onClick={() => handleAddTransitionCondition(selectedEdge.id, transitionIndex)}
                            >
                                Add Condition +
                            </StyledButton>
                        </ConditionWrapper>
                    }
                </React.Fragment>,
            )}
            <ButtonsWrapper>
                <StyledButton isBlue
                    onClick={() => handleAddNewTransition(selectedEdge.id)}
                >
                    Add Transition
                </StyledButton>
                <StyledButton isBlue
                    onClick={handleRemoveEdge}
                >
                    Remove All Transitions
                </StyledButton>
            </ButtonsWrapper>
        </div>
    );
};
