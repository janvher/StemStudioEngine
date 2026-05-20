import React, { useRef } from "react";
import { Edge, Node } from "reactflow";
import { LoopRepeat, LoopOnce } from "three";

import { selectInputWidth } from "./constants";
import { PropertyLabel, PropertyValue } from "./style";
import { IAnimationGraph } from "../../../../../../../animation";
import { useModelAnimationCombinerContext } from "@stem/editor-oss/context";
import { Animation } from "@stem/editor-oss/context/ModelAnimationCombinerContext";
import { showToast } from "@stem/editor-oss/showToast";
import { ElementsUtils } from "@stem/editor-oss/utils/ElementsUtils";
import { StyledButton } from "../../../../common/StyledButton";
import { TextInput } from "../../../../common/TextInput";
import { NumericInputRow } from "../../../../RightPanel/common/NumericInputRow";
import { PanelCheckbox } from "../../../../RightPanel/common/PanelCheckbox";
import { SelectRow } from "../../../../RightPanel/common/SelectRow";
import { Separator } from "../../../../RightPanel/common/Separator";
import trashIcon from "../../../assets/trash.svg";


interface Props {
    selectedNode: Node | null;
    animationGraph: IAnimationGraph;
    nodes: Node<any, string | undefined>[];
    setNodes: React.Dispatch<React.SetStateAction<Node<any, string | undefined>[]>>;
    edges: Edge<any>[];
    setEdges: React.Dispatch<React.SetStateAction<Edge<any>[]>>;
    onGraphChange: (graph: IAnimationGraph) => void;
    updateNodesAndEdges: (graph: IAnimationGraph, preservePositions?: boolean) => void;
    animationClips: Animation[];
}

export const NodePropertiesPanel = ({
    selectedNode,
    animationGraph,
    nodes,
    setNodes,
    edges,
    setEdges,
    onGraphChange,
    animationClips,
    updateNodesAndEdges,
}: Props) => {
    const { setSelectedNode } = useModelAnimationCombinerContext();
    const panelAnchorRef = useRef<HTMLDivElement>(null);

    if (!selectedNode || !animationGraph) return null;
    const state = animationGraph.getState(selectedNode.id);
    if (!state) return null;
    let duration: number | undefined = undefined;
    if (typeof state.payload.duration === "number") {
        duration = state.payload.duration;
    } else {
        const action = state.getAction();
        if (action && action.getClip) {
            duration = action.getClip().duration;
        }
    }
    let clipName: string | null = null;
    let blendClipNames: string[] = [];
    const isBlendTree = "getBlendTreeConfig" in state && typeof state.getBlendTreeConfig === "function";
    if (isBlendTree) {
        const blendTree = (state as any).getBlendTreeConfig();
        blendClipNames =
            blendTree.clips && Array.isArray(blendTree.clips)
                ? blendTree.clips.map((clip: any) => clip?.name || "").filter(Boolean)
                : [];
    } else if ("getAction" in state && typeof state.getAction === "function") {
        const action = state.getAction();
        if (action && action.getClip) {
            const clip = action.getClip();
            clipName = clip?.name || null;
        }
    }
    const handleClipChange = (name: string) => {
        const newClip = animationClips.find((clip: any) => clip.name === name);
        if (newClip && !isBlendTree) {
            (state as any).setClip?.(newClip);
            onGraphChange(animationGraph);
            if (updateNodesAndEdges) {
                updateNodesAndEdges(animationGraph, true);
            }
        }
    };
    const handleRemoveNode = () => {
        if (state.name === "ANY") {
            showToast({ type: "error", title: "Cannot remove the ANY state" });
            return;
        }
        if (animationGraph.getStates().length <= 1) {
            showToast({ type: "error", title: "Cannot remove the last state" });
            return;
        }
        const stateId = state.id;
        animationGraph.getStates().forEach((s: any) => {
            const filtered = s.getTransitions().filter((t: any) => t.targetState.id !== stateId);
            s.transitions = filtered;
        });
        (animationGraph as any).states.delete(stateId);
        setNodes(nodes.filter((n: any) => n.id !== stateId));
        setEdges(edges.filter((e: any) => e.source !== stateId && e.target !== stateId));
        if (animationGraph.getCurrentState?.()?.id === stateId) {
            const remaining = animationGraph.getStates();
            if (remaining.length > 0) {
                animationGraph.setState(remaining[0]!.id);
            }
        }
        setSelectedNode(null);
        onGraphChange(animationGraph);
    };

    const startRemovingNode = () => {
        ElementsUtils.confirm({
            title: "Confirm",
            content: "Are you sure you want to remove this node?",
            onOK: handleRemoveNode,
        });
    };

    const handleNameChange = (newName: string) => {
        if (!newName.trim()) return;
        state.name = newName;
        const updatedNodes = nodes.map((node: any) => {
            if (node.id === selectedNode.id) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        label: newName,
                    },
                };
            }
            return node;
        });
        setNodes(updatedNodes);
        onGraphChange(animationGraph);
    };

    return (
        <div ref={panelAnchorRef}
            style={{ position: "relative" }}
        >
            <PropertyLabel>Group Name</PropertyLabel>
            <Separator invisible
                margin="0 0 8px"
            />
            <TextInput
                value={state.name}
                width="100%"
                setValue={value => handleNameChange(value)}
                onBlur={e => handleNameChange(e.target.value)}
            />
            <Separator invisible
                margin="0 0 12px"
            />
            {isBlendTree ? 
                <PropertyValue>{blendClipNames.length > 0 ? blendClipNames.join(", ") : "—"}</PropertyValue>
             : 
                <SelectRow
                    data={
                        animationClips?.map(clip => ({
                            key: clip.uuid || clip.name,
                            value: clip.name,
                        })) || []
                    }
                    value={animationClips
                        ?.map((clip: any) => ({
                            key: clip.uuid || clip.name,
                            value: clip.name,
                        }))
                        .find(item => item.value === clipName)}
                    onChange={item => handleClipChange(item.value)}
                    label="Animation"
                    noPortal
                    width={selectInputWidth}
                    labelTooltip={<div style={{ lineHeight: 1.25 }}>Clip used by this state.</div>}
                    anchorRef={panelAnchorRef as React.RefObject<HTMLElement>}
                />
            }
            {state.name !== "ANY" &&
                <>
                    <NumericInputRow
                        label="Duration"
                        value={duration !== undefined ? duration : 0}
                        setValue={value => {
                            state.payload.duration = value;
                            onGraphChange(animationGraph);
                        }}
                        labelTooltip={<div style={{ lineHeight: 1.25 }}>Override clip duration for this state.</div>}
                        anchorRef={panelAnchorRef as React.RefObject<HTMLElement>}
                    />
                    <NumericInputRow
                        label="Speed"
                        value={typeof state.payload.timeScale === "number" ? state.payload.timeScale : 1}
                        setValue={value => {
                            (state as any).payload.timeScale = value;
                            const single = (state as any).getAction?.();
                            if (single && typeof single.timeScale === "number") {
                                single.timeScale = value;
                            }
                            const actions = (state as any).getActions?.();
                            if (Array.isArray(actions)) {
                                actions.forEach((a: any) => {
                                    if (a && typeof a.timeScale === "number") a.timeScale = value;
                                });
                            }
                            onGraphChange(animationGraph);
                        }}
                        labelTooltip={<div style={{ lineHeight: 1.25 }}>Playback rate multiplier.</div>}
                        anchorRef={panelAnchorRef as React.RefObject<HTMLElement>}
                    />
                    <PanelCheckbox
                        text="Loop"
                        checked={state.payload.loop === undefined ? true : !!state.payload.loop}
                        onChange={e => {
                            const checked = !!e.target.checked;
                            state.payload.loop = checked;
                            const single = (state as any).getAction?.();
                            if (single && typeof single.setLoop === "function") {
                                single.setLoop(checked ? LoopRepeat : LoopOnce, checked ? Infinity : 1);
                            } else if (single && "loop" in single) {
                                single.loop = checked ? LoopRepeat : LoopOnce;
                            }
                            const actions = (state as any).getActions?.();
                            if (Array.isArray(actions)) {
                                actions.forEach((a: any) => {
                                    if (a && typeof a.setLoop === "function") {
                                        a.setLoop(checked ? LoopRepeat : LoopOnce, checked ? Infinity : 1);
                                    } else if (a && "loop" in a) {
                                        a.loop = checked ? LoopRepeat : LoopOnce;
                                    }
                                });
                            }
                            onGraphChange(animationGraph);
                        }}
                    />
                </>
            }
            {state.name !== "ANY" && 
                <PanelCheckbox
                    text="Is Current State"
                    checked={!!state.isStateActive()}
                    onChange={e => {
                        const checked = !!e.target.checked;
                        if (!checked) {
                            const remaining = animationGraph.getStates();
                            if (remaining?.length > 0) {
                                animationGraph.setState(remaining[0]!.id);
                            }
                        } else {
                            animationGraph.setState(selectedNode.id);
                        }
                        onGraphChange(animationGraph);

                    }}
                />
            }
            {state.name !== "ANY" && 
                <StyledButton style={{ columnGap: "8px" }}
                    isRed
                    onClick={startRemovingNode}
                >
                    Remove Node <img style={{ marginBottom: "2px" }}
                        src={trashIcon}
                        alt=""
                                />
                </StyledButton>
            }
        </div>
    );
};
