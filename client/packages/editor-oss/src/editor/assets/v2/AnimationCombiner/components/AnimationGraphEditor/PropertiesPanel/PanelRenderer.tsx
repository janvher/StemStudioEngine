import {useCallback, useState} from "react";
import {Edge, Node} from "reactflow";

import {NodePropertiesPanel, TransitionPropertiesPanel, ParametersPanel} from ".";
import {PaddingContainer, PropertyGroup} from "./style";
import {IAnimationGraph, TransitionCondition} from "../../../../../../../animation/types";
import {useModelAnimationCombinerContext} from "@stem/editor-oss/context";
import {AnimationButtonSection, GraphPanelContainer, LabelButton, Separator} from "../../GraphPanel/GraphPanel.style";

export interface PanelProps {
    selectedNode: Node | null;
    animationGraph: IAnimationGraph;
    nodes: Node<any, string | undefined>[];
    setNodes: React.Dispatch<React.SetStateAction<Node<any, string | undefined>[]>>;
    edges: Edge<any>[];
    setEdges: React.Dispatch<React.SetStateAction<Edge<any>[]>>;
    onGraphChange: (graph: IAnimationGraph) => void;
    updateNodesAndEdges: (graph: IAnimationGraph, preservePositions?: boolean) => void;
    logGraphChanges: (message: string, graph: IAnimationGraph) => void;
    selectedEdge: Edge | null;
    setSelectedEdge: React.Dispatch<React.SetStateAction<Edge | null>>;
}

export type ParamType = "float" | "int" | "bool" | "trigger";

export const PanelRenderer = ({
    selectedNode,
    nodes,
    setNodes,
    edges,
    setEdges,
    onGraphChange,
    animationGraph,
    updateNodesAndEdges,
    logGraphChanges,
    selectedEdge,
    setSelectedEdge,
}: PanelProps) => {
    const {animations} = useModelAnimationCombinerContext();

    const [newParamName, setNewParamName] = useState("");
    const [newParamType, setNewParamType] = useState<ParamType>("float");
    const [newParamDefault, setNewParamDefault] = useState<number | boolean>();

    const resolveEdgeEndpoints = useCallback(
        (edgeId: string): {sourceId?: string; targetId?: string} => {
            const edge =
                edges.find(e => e.id === edgeId) || (selectedEdge && selectedEdge.id === edgeId ? selectedEdge : null);
            const sourceId = (edge as any)?.source || (edge as any)?.data?.sourceState;
            const targetId = (edge as any)?.target || (edge as any)?.data?.targetState;
            return {sourceId, targetId};
        },
        [edges, selectedEdge],
    );

    const handleAddParameter = useCallback(
        (name: string, type: ParamType, defaultValue: number | boolean) => {
            if (!animationGraph) return;

            animationGraph.addParameter(name, type, defaultValue);

            logGraphChanges("Added parameter", animationGraph);
            onGraphChange(animationGraph);

            setNewParamName("");
            setNewParamType("float");
            setNewParamDefault(undefined);
        },
        [animationGraph, onGraphChange, logGraphChanges, setNewParamName, setNewParamType, setNewParamDefault],
    );

    const handleRemoveParameter = useCallback(
        (name: string) => {
            if (!animationGraph) return;

            animationGraph.removeParameter(name);

            logGraphChanges("Removed parameter", animationGraph);
            onGraphChange(animationGraph);
        },
        [animationGraph, onGraphChange, logGraphChanges],
    );

    const handleTransitionConditionChange = useCallback(
        (
            edgeId: string,
            transitionIndex: number,
            conditionIndex: number,
            field: keyof TransitionCondition,
            value: string,
        ) => {
            if (!animationGraph) {
                return;
            }

            const {sourceId, targetId} = resolveEdgeEndpoints(edgeId);
            if (!sourceId || !targetId) {
                return;
            }
            const sourceState = animationGraph.getState(sourceId);
            if (!sourceState) {
                return;
            }

            const transitionsToTarget = sourceState.getTransitions().filter(t => t.targetState.id === targetId);
            if (transitionIndex >= transitionsToTarget.length) {
                return;
            }

            const transition = transitionsToTarget[transitionIndex];
            if (!transition) {
                return;
            }
            const condition = transition.conditions[conditionIndex];
            if (!condition) {
                return;
            }
            // Normalize value types: convert string to proper type based on field/parameter
            let nextVal: any = value;
            if (field === "value") {
                const param = Array.from(animationGraph.getParameters().values()).find(
                    p => p.name === condition.parameter,
                );
                if (param?.type === "bool" || param?.type === "trigger") {
                    nextVal = typeof value === "string" ? value === "true" : Boolean(value);
                } else {
                    const num = Number(value);
                    nextVal = Number.isFinite(num) ? num : 0;
                }
            }
            // @ts-expect-error - dynamic field key cannot be statically indexed on condition
            condition[field] = nextVal;

            onGraphChange(animationGraph);
        },
        [animationGraph, onGraphChange],
    );

    const handleAddTransitionCondition = useCallback(
        (edgeId: string, transitionIndex: number = 0) => {
            if (!animationGraph) {
                return;
            }

            const {sourceId, targetId} = resolveEdgeEndpoints(edgeId);
            if (!sourceId || !targetId) {
                return;
            }
            const sourceState = animationGraph.getState(sourceId);
            if (!sourceState) {
                return;
            }

            const transitionsToTarget = sourceState.getTransitions().filter(t => t.targetState.id === targetId);
            if (transitionIndex >= transitionsToTarget.length) {
                return;
            }

            const transition = transitionsToTarget[transitionIndex];
            if (!transition) {
                return;
            }
            transition.conditions.push({
                parameter: "trigger",
                operator: "equals",
                value: true,
            });

            onGraphChange(animationGraph);
        },
        [animationGraph, onGraphChange],
    );

    const handleRemoveTransitionCondition = useCallback(
        (edgeId: string, transitionIndex: number, conditionIndex: number) => {
            if (!animationGraph) {
                return;
            }

            const {sourceId, targetId} = resolveEdgeEndpoints(edgeId);
            if (!sourceId || !targetId) {
                return;
            }
            const sourceState = animationGraph.getState(sourceId);
            if (!sourceState) {
                return;
            }

            const transitionsToTarget = sourceState.getTransitions().filter(t => t.targetState.id === targetId);

            if (transitionIndex >= transitionsToTarget.length) {
                return;
            }

            const transition = transitionsToTarget[transitionIndex];
            if (!transition) {
                return;
            }
            transition.conditions.splice(conditionIndex, 1);

            onGraphChange(animationGraph);
        },
        [animationGraph, onGraphChange],
    );

    const handleAddNewTransition = useCallback(
        (edgeId: string) => {
            if (!animationGraph) {
                return;
            }

            const {sourceId, targetId} = resolveEdgeEndpoints(edgeId);
            if (!sourceId || !targetId) {
                return;
            }
            const sourceState = animationGraph.getState(sourceId);
            const targetState = animationGraph.getState(targetId);
            if (!sourceState || !targetState) return;

            const defaultCondition: TransitionCondition = {
                parameter: "trigger",
                operator: "equals",
                value: true,
            };

            animationGraph.addTransition(sourceId, targetId, [defaultCondition], {
                fadeInDuration: 0.2,
                fadeOutDuration: 0.2,
            });

            logGraphChanges("Added new transition", animationGraph);
            onGraphChange(animationGraph);
        },
        [animationGraph, onGraphChange, logGraphChanges],
    );

    const handleRemoveSpecificTransition = useCallback(
        (edgeId: string, transitionIndex: number) => {
            if (!animationGraph) {
                return;
            }

            const {sourceId, targetId} = resolveEdgeEndpoints(edgeId);
            if (!sourceId || !targetId) {
                return;
            }
            animationGraph.removeSpecificTransition(sourceId, targetId, transitionIndex);

            logGraphChanges("Removed specific transition", animationGraph);
            onGraphChange(animationGraph);
        },
        [animationGraph, onGraphChange, logGraphChanges, selectedEdge, setSelectedEdge],
    );
    const label = selectedNode ? "Group Node" : selectedEdge ? "Transition Properties" : "Parameters";

    return (
        <GraphPanelContainer>
            <PropertyGroup>
                <AnimationButtonSection>
                    <LabelButton>{label}</LabelButton>
                </AnimationButtonSection>
                <Separator style={{marginBottom: "8px"}} />
                <PaddingContainer className="hidden-scroll">
                    {selectedNode && 
                        <NodePropertiesPanel
                            selectedNode={selectedNode}
                            animationGraph={animationGraph}
                            nodes={nodes}
                            setNodes={setNodes}
                            edges={edges}
                            setEdges={setEdges}
                            onGraphChange={onGraphChange}
                            animationClips={animations}
                            updateNodesAndEdges={updateNodesAndEdges}
                        />
                    }
                    {selectedEdge && 
                        <TransitionPropertiesPanel
                            animationGraph={animationGraph}
                            handleTransitionConditionChange={handleTransitionConditionChange}
                            handleRemoveTransitionCondition={handleRemoveTransitionCondition}
                            handleAddTransitionCondition={handleAddTransitionCondition}
                            handleAddNewTransition={handleAddNewTransition}
                            handleRemoveSpecificTransition={handleRemoveSpecificTransition}
                            onGraphChange={onGraphChange}
                            edges={edges}
                            setEdges={setEdges}
                        />
                    }
                    {!selectedNode && !selectedEdge && 
                        <ParametersPanel
                            animationGraph={animationGraph}
                            newParamName={newParamName}
                            setNewParamName={setNewParamName}
                            newParamType={newParamType}
                            setNewParamType={setNewParamType}
                            newParamDefault={newParamDefault}
                            setNewParamDefault={setNewParamDefault}
                            onGraphChange={onGraphChange}
                            onAddParameter={handleAddParameter}
                            onRemoveParameter={handleRemoveParameter}
                        />
                    }
                </PaddingContainer>
            </PropertyGroup>
        </GraphPanelContainer>
    );
};
