import React, {useCallback, useEffect, useRef} from "react";
import {AnimationClip} from "three";
import {
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    Connection,
    ReactFlowProvider,
    useReactFlow,
    MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import styled from "styled-components";

import {PanelRenderer} from "./PropertiesPanel/PanelRenderer";
import {VisualDesigner} from "./VisualDesigner";
import {AnimationState} from "../../../../../../animation/AnimationState";
import {BlendTreeState} from "../../../../../../animation/BlendTreeState";
import {IAnimationGraph, TransitionCondition} from "../../../../../../animation/types";
import {useModelAnimationCombinerContext} from "@stem/editor-oss/context";

const Container = styled.div`
    width: 100%;
    height: 100%;
    background: var(--theme-grey-bg-tertiary);
    position: relative;
`;

const FlowContainer = styled.div`
    width: 100%;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
`;

const EmptyState = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--theme-font-main-selected-color);
    font-size: var(--theme-font-size-s);
`;

export const AnimationGraphEditor: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const flowRef = useRef<HTMLDivElement>(null);
    const {fitView} = useReactFlow();
    const {
        uploadOptionSelected,
        setUploadOptionSelected,
        selectedEdge,
        selectedNode,
        setSelectedEdge,
        setSelectedNode,
        mainModel,
        animationGraph,
        setAnimationGraph,
    } = useModelAnimationCombinerContext();
    const copiedNodeIdRef = useRef<string | null>(null);
    const onGraphChange = useCallback((graph: IAnimationGraph) => setAnimationGraph(graph), [setAnimationGraph]);

    const updateNodesAndEdges = useCallback((graph: IAnimationGraph, preservePositions: boolean = false) => {
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        const states = graph.getStates();

        states.forEach((state, index) => {
            const savedPosition = state.getPosition();
            let position: {x: number; y: number};
            if (
                preservePositions &&
                savedPosition &&
                typeof savedPosition.x === "number" &&
                typeof savedPosition.y === "number" &&
                !isNaN(savedPosition.x) &&
                !isNaN(savedPosition.y)
            ) {
                position = savedPosition;
            } else {
                const x = index % 3 * 250 + 100;
                const y = Math.floor(index / 3) * 150 + 100;
                position = {x, y};
                state.setPosition(x, y);
            }
            newNodes.push({
                id: state.id,
                type: "animationState",
                position,
                data: {
                    label: state.name,
                    isCurrent: state === (graph as any).getCurrentState?.(),
                },
                width: 120,
                height: 42,
            });
        });

        states.forEach(state => {
            const transitions = state.getTransitions();

            const transitionsByTarget = new Map<string, any[]>();
            transitions.forEach(transition => {
                if (!graph.getState(transition.targetState.id)) {
                    return;
                }

                const targetId = transition.targetState.id;
                if (!transitionsByTarget.has(targetId)) {
                    transitionsByTarget.set(targetId, []);
                }
                transitionsByTarget.get(targetId)!.push(transition);
            });

            transitionsByTarget.forEach((transitionsToTarget, targetId) => {
                const edgeId = `${state.id}-${targetId}`;

                const allConditions = transitionsToTarget.flatMap(t => t.conditions);
                const label = allConditions.map(c => `${c.parameter} ${c.operator} ${c.value}`).join(", ");

                newEdges.push({
                    id: edgeId,
                    source: state.id,
                    target: targetId,
                    type: "floating",
                    animated: true,
                    label: label,
                    data: {
                        transitions: transitionsToTarget,
                        sourceState: state.id,
                        targetState: targetId,
                    },
                    style: {
                        stroke: "#666",
                        strokeWidth: 2,
                        opacity: 1,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        width: 20,
                        height: 20,
                        color: "#666",
                    },
                });
            });
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, []);

    const applySerializedAnimationGraph = useCallback(
        (graphStr: string) => {
            if (!graphStr || !animationGraph || !mainModel) return;
            try {
                const animsArr = mainModel._obj?.animations || mainModel.animations || [];
                const anims: Record<string, AnimationClip> = {};
                animsArr.forEach((clip: AnimationClip) => {
                    if (clip && clip.name) {
                        anims[clip.name] = clip;
                    }
                });
                animationGraph.fromJSON(graphStr, anims);
                onGraphChange(animationGraph);
                updateNodesAndEdges(animationGraph, false);
            } catch {
                /* ignore malformed graph JSON */
            }
        },
        [animationGraph, mainModel, onGraphChange, updateNodesAndEdges],
    );

    const logGraphChanges = useCallback((message: string, graph: IAnimationGraph) => {
        // Intentionally a no-op; params retained for the call-site contract.
        void message;
        void graph;
    }, []);

    useEffect(() => {
        if (!animationGraph) return;

        updateNodesAndEdges(animationGraph, true);

        const handleStateChanged = (event: {stateId: string}) => {
            setNodes(prevNodes =>
                prevNodes.map(node => ({
                    ...node,
                    data: {
                        ...node.data,
                        isCurrent: node.id === event.stateId,
                    },
                })),
            );
        };

        const handleStateAdded = () => {
            updateNodesAndEdges(animationGraph, true);
        };

        const handleStateRemoved = () => {
            updateNodesAndEdges(animationGraph, true);
        };

        const handleTransitionAdded = () => {
            updateNodesAndEdges(animationGraph, true);
        };

        const handleTransitionRemoved = () => {
            updateNodesAndEdges(animationGraph, true);
        };

        const handleParameterAdded = () => {
            updateNodesAndEdges(animationGraph, true);
        };

        const handleParameterRemoved = () => {
            updateNodesAndEdges(animationGraph, true);
        };

        const handleParameterChanged = () => {
            updateNodesAndEdges(animationGraph, true);
        };

        animationGraph.addEventListener("stateChanged", handleStateChanged);
        animationGraph.addEventListener("stateAdded", handleStateAdded);
        animationGraph.addEventListener("stateRemoved", handleStateRemoved);
        animationGraph.addEventListener("transitionAdded", handleTransitionAdded);
        animationGraph.addEventListener("transitionRemoved", handleTransitionRemoved);
        animationGraph.addEventListener("parameterAdded", handleParameterAdded);
        animationGraph.addEventListener("parameterRemoved", handleParameterRemoved);
        animationGraph.addEventListener("parameterChanged", handleParameterChanged);

        return () => {
            animationGraph.removeEventListener("stateChanged", handleStateChanged);
            animationGraph.removeEventListener("stateAdded", handleStateAdded);
            animationGraph.removeEventListener("stateRemoved", handleStateRemoved);
            animationGraph.removeEventListener("transitionAdded", handleTransitionAdded);
            animationGraph.removeEventListener("transitionRemoved", handleTransitionRemoved);
            animationGraph.removeEventListener("parameterAdded", handleParameterAdded);
            animationGraph.removeEventListener("parameterRemoved", handleParameterRemoved);
            animationGraph.removeEventListener("parameterChanged", handleParameterChanged);
        };
    }, [animationGraph, updateNodesAndEdges]);

    const handleNodesChange = useCallback(
        (changes: any[]) => {
            if (!animationGraph) return;

            changes.forEach(change => {
                if (change.type === "position") {
                    const state = animationGraph.getState(change.id);
                    if (state) {
                        if (change.position) {
                            state.setPosition(change.position.x, change.position.y);
                        }

                        if (change.dragging === false) {
                            onGraphChange(animationGraph);
                        }
                    }
                }
            });

            onNodesChange(changes);
        },
        [animationGraph, onNodesChange, onGraphChange],
    );

    const onConnect = useCallback(
        (params: Connection) => {
            if (!animationGraph) return;

            const sourceState = animationGraph.getState(params.source as string);
            const targetState = animationGraph.getState(params.target as string);

            if (sourceState && targetState) {
                const existingTransition = sourceState.getTransitions().find(t => t.targetState.id === targetState.id);

                if (!existingTransition) {
                    const defaultCondition: TransitionCondition = {
                        parameter: "trigger",
                        operator: "equals",
                        value: true,
                    };

                    animationGraph.addTransition(sourceState.id, targetState.id, [defaultCondition], {
                        fadeInDuration: 0.2,
                        fadeOutDuration: 0.2,
                    });

                    logGraphChanges("Added transition", animationGraph);
                    onGraphChange(animationGraph);

                    updateNodesAndEdges(animationGraph, true);
                }
            }
        },
        [animationGraph, onGraphChange, logGraphChanges, updateNodesAndEdges],
    );

    const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
        setSelectedEdge(null);
        setUploadOptionSelected(false);
    }, []);

    const handleEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        setSelectedEdge(edge);
        setSelectedNode(null);
    }, []);

    const handlePaneClick = useCallback(() => {
        setSelectedNode(null);
        setSelectedEdge(null);
    }, []);

    const handleAddState = useCallback(() => {
        if (!animationGraph) return;

        const baseName = "NewState";
        const clip = new AnimationClip(baseName, 0, []);

        let stateName = baseName;
        let counter = 2;
        while (animationGraph.getStates().some(s => s.name === stateName)) {
            stateName = `${baseName}${counter}`;
            counter++;
        }

        const newState = new AnimationState(undefined, stateName, clip);
        const defaultPosition = {
            x: animationGraph.getStates().length % 3 * 250 + 100,
            y: Math.floor(animationGraph.getStates().length / 3) * 150 + 100,
        };
        newState.setPosition(defaultPosition.x, defaultPosition.y);

        animationGraph.addState(newState);

        if (animationGraph.getStates().length === 1) {
            animationGraph.setState(newState.id);
        }

        logGraphChanges("Added new state", animationGraph);
        onGraphChange(animationGraph);

        updateNodesAndEdges(animationGraph, true);

        setTimeout(() => {
            fitView({padding: 0.5, duration: 800});
        }, 100);
    }, [animationGraph, onGraphChange, logGraphChanges, updateNodesAndEdges, fitView]);

    const handleRemoveState = useCallback(
        (stateId: string) => {
            if (!animationGraph) return;

            animationGraph.removeState(stateId);

            logGraphChanges("Removed state", animationGraph);
            onGraphChange(animationGraph);

            if (selectedNode?.id === stateId) {
                setSelectedNode(null);
            }

            updateNodesAndEdges(animationGraph, true);
        },
        [animationGraph, onGraphChange, logGraphChanges, updateNodesAndEdges, selectedNode, setSelectedNode],
    );

    // Duplicate a node (state) including its transitions
    const duplicateNode = useCallback(
        (stateId: string) => {
            if (!animationGraph) return;
            const original = animationGraph.getState(stateId) as any;
            if (!original) return;

            // Unique name generation
            const existingNames = new Set(animationGraph.getStates().map(s => s.name));
            const base = `${original.name} Copy`;
            let newName = base;
            let i = 2;
            while (existingNames.has(newName)) {
                newName = `${base} ${i++}`;
            }

            // Position offset
            const pos = original.getPosition?.() || {x: 100, y: 100};
            const newPos = {x: pos.x + 30, y: pos.y + 30};

            // Clone payload shallowly
            const payload = {...original.payload || {}};

            // Create new state preserving type
            let newState: any;
            const isBlendTree = typeof original.getBlendTreeConfig === "function";
            if (isBlendTree) {
                const bt = original.getBlendTreeConfig();
                const clonedBT = {
                    ...bt,
                    clips: [...bt.clips || []],
                    positions: (bt.positions || []).map((p: number[]) => [...p]),
                    parameters: bt.parameters ? [...bt.parameters] : bt.parameters,
                };
                newState = new BlendTreeState(undefined, newName, clonedBT, payload);
            } else {
                // Try to reuse the same clip reference if available
                const action = original.getAction?.();
                const clip = action && typeof action.getClip === "function" ? action.getClip() : undefined;
                newState = new AnimationState(undefined, newName, clip, payload);
            }
            newState.setPosition(newPos.x, newPos.y);
            animationGraph.addState(newState);

            // Copy outgoing transitions (from original to its targets)
            const outgoing = original.getTransitions?.() || [];
            outgoing.forEach((t: any) => {
                if (!t?.targetState?.id) return;
                const options = {
                    fadeInDuration: t.fadeInDuration,
                    fadeOutDuration: t.fadeOutDuration,
                    hasExitTime: t.hasExitTime,
                    exitTime: t.exitTime,
                    fixedDuration: t.fixedDuration,
                    offset: t.offset,
                    interruptionSource: t.interruptionSource,
                    orderedInterruption: t.orderedInterruption,
                } as any;
                const conditions = Array.isArray(t.conditions) ? t.conditions.map((c: any) => ({...c})) : [];
                animationGraph.addTransition(newState.id, t.targetState.id, conditions, options);
            });

            // Copy incoming transitions (other states pointing to original)
            animationGraph.getStates().forEach((s: any) => {
                const transitions = s.getTransitions?.() || [];
                transitions.forEach((t: any) => {
                    if (t?.targetState?.id === original.id) {
                        const options = {
                            fadeInDuration: t.fadeInDuration,
                            fadeOutDuration: t.fadeOutDuration,
                            hasExitTime: t.hasExitTime,
                            exitTime: t.exitTime,
                            fixedDuration: t.fixedDuration,
                            offset: t.offset,
                            interruptionSource: t.interruptionSource,
                            orderedInterruption: t.orderedInterruption,
                        } as any;
                        const conditions = Array.isArray(t.conditions) ? t.conditions.map((c: any) => ({...c})) : [];
                        animationGraph.addTransition(s.id, newState.id, conditions, options);
                    }
                });
            });

            onGraphChange(animationGraph);
            updateNodesAndEdges(animationGraph, true);
        },
        [animationGraph, onGraphChange, updateNodesAndEdges],
    );

    // Global key handlers for copy/paste
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (!mod) return;
            const key = e.key.toLowerCase();
            if (key === "c") {
                if (selectedNode) {
                    copiedNodeIdRef.current = selectedNode.id;
                    e.preventDefault();
                }
            } else if (key === "v") {
                const id = copiedNodeIdRef.current;
                if (id) {
                    duplicateNode(id);
                    e.preventDefault();
                }
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [duplicateNode, selectedNode]);

    // Intercept Delete/Backspace to remove selected node/edge and stop propagation to Editor
    useEffect(() => {
        const onDeleteKey = (e: KeyboardEvent) => {
            if (e.key === "Delete" || e.key === "Backspace") {
                // Don't hijack keystrokes when typing in inputs/textareas/contenteditable
                const target = e.target as HTMLElement | null;
                const isEditable =
                    !!target &&
                    (target.tagName === "INPUT" ||
                        target.tagName === "TEXTAREA" ||
                        target.isContentEditable);
                if (isEditable) return;

                // Prevent the global editor handler from deleting scene objects
                e.stopPropagation();
                e.preventDefault();
                if (selectedNode || selectedEdge) {
                    // Remove selected graph entity if any
                    if (selectedNode) {
                        handleRemoveState(selectedNode.id);
                    } else if (selectedEdge && animationGraph) {
                        const fromId = (selectedEdge.source || "").toString();
                        const toId = (selectedEdge.target || "").toString();
                        if (fromId && toId) {
                            animationGraph.removeTransition(fromId, toId);
                            logGraphChanges("Removed transition", animationGraph);
                            onGraphChange(animationGraph);
                            if (selectedEdge?.id === `${fromId}-${toId}`) {
                                setSelectedEdge(null);
                            }
                        }
                    }
                }
            }
        };
        // Use capture phase to ensure we intercept before other handlers
        window.addEventListener("keydown", onDeleteKey, {capture: true});
        return () => window.removeEventListener("keydown", onDeleteKey, {capture: true});
    }, [
        animationGraph,
        handleRemoveState,
        logGraphChanges,
        onGraphChange,
        selectedEdge,
        selectedNode,
        setSelectedEdge,
    ]);

    const handleRemoveTransition = useCallback(
        (fromStateId: string, toStateId: string) => {
            if (!animationGraph) return;

            animationGraph.removeTransition(fromStateId, toStateId);

            logGraphChanges("Removed transition", animationGraph);
            onGraphChange(animationGraph);

            if (selectedEdge?.id === `${fromStateId}-${toStateId}`) {
                setSelectedEdge(null);
            }
        },
        [animationGraph, onGraphChange, logGraphChanges, selectedEdge, setSelectedEdge],
    );

    // Helper to get animation names from mainModel
    const getAnimationClipNames = useCallback((): string[] => {
        if (!mainModel) return [];
        // Try _obj.animations, then animations
        const anims = mainModel._obj?.animations || mainModel.animations || [];
        return anims.map((clip: any) => clip?.name).filter((n: any) => !!n);
    }, [mainModel]);

    if (!animationGraph) {
        return (
            <Container>
                <EmptyState>No animation graph available</EmptyState>
            </Container>
        );
    }

    return (
        <Container>
            <ReactFlowProvider>
                <FlowContainer ref={flowRef}>
                    <VisualDesigner
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={handleNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={handleNodeClick}
                        onEdgeClick={handleEdgeClick}
                        onPaneClick={handlePaneClick}
                        handleAddState={handleAddState}
                        handleRemoveState={handleRemoveState}
                        handleRemoveTransition={handleRemoveTransition}
                        animationGraph={animationGraph}
                        getAnimationClipNames={getAnimationClipNames}
                        setSerializedAnimationGraph={applySerializedAnimationGraph}
                        duplicateNode={duplicateNode}
                    />
                </FlowContainer>
                {!uploadOptionSelected && 
                    <PanelRenderer
                        logGraphChanges={logGraphChanges}
                        selectedNode={selectedNode}
                        animationGraph={animationGraph}
                        nodes={nodes}
                        setNodes={setNodes}
                        edges={edges}
                        setEdges={setEdges}
                        onGraphChange={onGraphChange}
                        updateNodesAndEdges={updateNodesAndEdges}
                        selectedEdge={selectedEdge}
                        setSelectedEdge={setSelectedEdge}
                    />
                }
            </ReactFlowProvider>
        </Container>
    );
};
