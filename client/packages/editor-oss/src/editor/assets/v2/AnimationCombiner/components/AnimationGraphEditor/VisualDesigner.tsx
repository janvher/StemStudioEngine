import React, {useCallback, useEffect, useRef, useState} from "react";
import ReactFlow, {Background, useReactFlow, ConnectionMode, Node, Edge} from "reactflow";
import styled from "styled-components";

import CustomConnectionLine from "./CustomConnectionLine";
import {CustomEdge} from "./CustomEdge";
import {CustomNode} from "./CustomNode";
import {FloatingEdge} from "./FloatingEdge";
import {IAnimationGraph} from "../../../../../../animation";
import {getAIBackend} from "../../../../../../ai";
import {useModelAnimationCombinerContext} from "@stem/editor-oss/context";
import {showToast} from "@stem/editor-oss/showToast";
import {ElementsUtils} from "@stem/editor-oss/utils/ElementsUtils";
import {ActionButton} from "../../../ActionBar/ActionBar.style";
import {Tooltip} from "../../../common/Tooltip";
import animationIcon from "../../../icons/animation-icon.png";
import dotsMenuIcon from "../../../icons/dots-menu.svg";
import magicAiIcon from "../../../icons/magic-ai.svg";
import plusIcon from "../../../icons/plus-icon.svg";
import {useModelExport} from "../../hooks/useModelExport";

const ActionPanel = styled.div`
    position: absolute;
    bottom: 18px;
    left: 50%;
    transform: translateX(-50%);
    height: 48px;
    padding: 8px 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    column-gap: 8px;
    border-radius: 16px;
    border: 1px solid #ffffff1a;
    background: var(--theme-container-minor-dark);
    z-index: 5;
`;

const SpinnerOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.2);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
`;
const Spinner = styled.div`
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    @keyframes spin {
        0% {
            transform: rotate(0deg);
        }
        100% {
            transform: rotate(360deg);
        }
    }
`;

const Menu = styled.div`
    position: fixed;
    z-index: 10;
    background: var(--theme-container-main-dark);
    color: var(--theme-font-main-selected-color);
    border: 1px solid #ffffff40;
    border-radius: 8px;
    min-width: 160px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    overflow: hidden;
`;
const MenuItem = styled.div`
    padding: 8px 12px;
    font-size: 12px;
    cursor: pointer;
    &:hover {
        background: rgba(255, 255, 255, 0.06);
    }
`;

const InfoButton = styled.button`
    position: absolute;
    top: 12px;
    left: 12px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid #ffffff40;
    background: var(--theme-container-minor-dark);
    color: var(--theme-font-main-selected-color);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover {
        background: rgba(255, 255, 255, 0.1);
    }
`;

const InfoPopover = styled.div`
    position: absolute;
    top: 44px;
    left: 12px;
    width: 320px;
    max-height: 400px;
    overflow-y: auto;
    padding: 16px;
    background: var(--theme-container-main-dark);
    border: 1px solid #ffffff40;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    z-index: 10;
    color: var(--theme-font-main-selected-color);
    font-size: 12px;
    line-height: 1.5;
`;

const InfoTitle = styled.h3`
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
`;

const InfoSection = styled.div`
    margin-bottom: 12px;
    &:last-child {
        margin-bottom: 0;
    }
`;

const InfoSectionTitle = styled.h4`
    margin: 0 0 4px 0;
    font-size: 12px;
    font-weight: 600;
    color: #7dd3fc;
`;

const InfoText = styled.p`
    margin: 0 0 8px 0;
    &:last-child {
        margin-bottom: 0;
    }
`;

const InfoExample = styled.div`
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    padding: 8px;
    font-family: monospace;
    font-size: 11px;
    margin-top: 4px;
`;

const nodeTypes = {
    animationState: CustomNode,
};

const edgeTypes = {
    floating: FloatingEdge,
    custom: CustomEdge,
};

const defaultViewport = {x: 0, y: 0, zoom: 1};

export const VisualDesigner: React.FC<{
    nodes: Node[];
    edges: Edge[];
    onNodesChange: any;
    onEdgesChange: any;
    onConnect: any;
    onNodeClick: any;
    onEdgeClick: any;
    onPaneClick: any;
    handleAddState: () => void;
    handleRemoveState: (stateId: string) => void;
    handleRemoveTransition: (fromStateId: string, toStateId: string) => void;
    animationGraph: IAnimationGraph;
    getAnimationClipNames: () => string[];
    setSerializedAnimationGraph: (graphStr: string) => void;
    duplicateNode: (stateId: string) => void;
}> = ({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    handleAddState,
    handleRemoveState,
    handleRemoveTransition,
    animationGraph,
    getAnimationClipNames,
    setSerializedAnimationGraph,
    duplicateNode,
}) => {
    const {fitView, getNode} = useReactFlow();
    const {setUploadOptionSelected, uploadOptionSelected} = useModelAnimationCombinerContext();
    const {exportGLB, exportGLTF} = useModelExport();
    const [loading, setLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const exportBtnRef = useRef<HTMLButtonElement>(null);
    const [exportMenuPos, setExportMenuPos] = useState({x: 0, y: 0});
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        nodeId: string | null;
    }>({visible: false, x: 0, y: 0, nodeId: null});

    useEffect(() => {}, [nodes, edges]);

    const onAddState = useCallback(() => {
        setTimeout(() => {
            fitView({padding: 0.3, duration: 800});
        }, 100);
        handleAddState();
    }, [handleAddState]);

    const getConnectionLineStyle = useCallback(
        () => ({
            stroke: "#666",
            strokeWidth: 2,
        }),
        [],
    );

    const getConnectionLineComponent = useCallback(
        (props: any) => {
            const {fromX, fromY, toX, toY, connectionLineStyle} = props;
            const sourceNode = getNode(fromX);
            const targetNode = getNode(toX);
            return (
                <CustomConnectionLine
                    fromX={fromX}
                    fromY={fromY}
                    toX={toX}
                    toY={toY}
                    connectionLineStyle={connectionLineStyle}
                    sourceNode={sourceNode}
                    targetNode={targetNode}
                />
            );
        },
        [getNode],
    );

    const handleDownloadGraph = useCallback(() => {
        if (!animationGraph) return;
        const json = animationGraph.toJSON();
        const blob = new Blob([json], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "animation-graph.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast({type: "success", title: "Animation graph exported"});
    }, [animationGraph]);

    const handleImportGraph = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const content = e.target?.result as string;
                    JSON.parse(content);
                    setSerializedAnimationGraph(content);
                    showToast({type: "success", title: "Animation graph imported"});
                    setTimeout(() => fitView({padding: 0.2, duration: 600}), 50);
                } catch (err) {
                    showToast({type: "error", title: "Invalid animation graph JSON"});
                }
            };
            reader.readAsText(file);
            event.target.value = "";
        },
        [setSerializedAnimationGraph, fitView],
    );

    const handleGenerateGraph = useCallback(() => {
        const uniqueClips = Array.from(new Set(getAnimationClipNames()));
        if (!uniqueClips.length) {
            showToast({type: "error", title: "No animations found to generate graph"});
            return;
        }

        ElementsUtils.confirm({
            title: "Confirm",
            content: "Generate animation graph from animations? This will overwrite the current graph.",
            onOK: async () => {
                setLoading(true);
                try {
                    const res = await getAIBackend().request<{
                        data?: {graph?: string};
                        Data?: {graph?: string};
                        graph?: string;
                    }>("/api/AI/AnimationGraph/Generate", {
                        method: "POST",
                        body: {animations: uniqueClips},
                    });
                    if (!res.ok) {
                        throw new Error("Request failed");
                    }
                    const json = res.data;
                    const graphStr = json?.data?.graph || json?.Data?.graph || json?.graph || "";
                    if (!graphStr) {
                        throw new Error("Empty graph response");
                    }
                    setSerializedAnimationGraph(graphStr);
                    showToast({type: "success", title: "Animation graph generated"});
                    setTimeout(() => fitView({padding: 0.2, duration: 600}), 50);
                } catch (e: any) {
                    showToast({type: "error", title: e?.message || "Failed to generate graph"});
                } finally {
                    setLoading(false);
                }
            },
        });
    }, [getAnimationClipNames, fitView, setSerializedAnimationGraph]);

    const handleToggleExportMenu = useCallback(() => {
        if (showExportMenu) {
            setShowExportMenu(false);
            return;
        }
        const rect = exportBtnRef.current?.getBoundingClientRect();
        if (rect) {
            setExportMenuPos({
                x: rect.left + rect.width / 2 - 110,
                y: rect.top - 152,
            });
        }
        setShowExportMenu(true);
    }, [showExportMenu]);

    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        setContextMenu({visible: true, x: event.clientX, y: event.clientY, nodeId: node.id});
    }, []);

    useEffect(() => {
        const hide = () => {
            setContextMenu(cm => ({...cm, visible: false}));
            setShowExportMenu(false);
        };
        window.addEventListener("click", hide);
        return () => {
            window.removeEventListener("click", hide);
        };
    }, []);

    return (
        <>
            {loading && 
                <SpinnerOverlay>
                    <Spinner />
                </SpinnerOverlay>
            }
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onNodeContextMenu={onNodeContextMenu}
                onEdgeClick={onEdgeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultViewport={defaultViewport}
                minZoom={0.1}
                maxZoom={2}
                fitView
                fitViewOptions={{padding: 0.2}}
                connectionMode={ConnectionMode.Loose}
                connectionRadius={20}
                connectionLineComponent={getConnectionLineComponent}
                connectionLineStyle={getConnectionLineStyle()}
                selectNodesOnDrag={false}
                elementsSelectable
                proOptions={{hideAttribution: true}}
            >
                <Background />
                <InfoButton onClick={() => setShowInfo(!showInfo)}>i</InfoButton>
                {showInfo && 
                    <InfoPopover onClick={e => e.stopPropagation()}>
                        <InfoTitle>Animation Graph Guide</InfoTitle>

                        <InfoSection>
                            <InfoSectionTitle>How It Works</InfoSectionTitle>
                            <InfoText>
                                The animation graph is a state machine that controls how animations transition between
                                each other. Each node represents an animation state, and arrows (transitions) define how
                                states connect.
                            </InfoText>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>States</InfoSectionTitle>
                            <InfoText>
                                Each state contains one or more animation clips. When active, the state plays its
                                animations. Click a state to configure its animations and properties.
                            </InfoText>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>Transitions</InfoSectionTitle>
                            <InfoText>
                                Drag from one state to another to create a transition. Transitions can have conditions
                                based on parameters (e.g., "speed &gt; 0.5" or "isJumping = true").
                            </InfoText>
                            <InfoExample>Example: Idle → Walk when "speed &gt; 0.1"</InfoExample>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>Parameters</InfoSectionTitle>
                            <InfoText>Parameters are variables that control transitions. Types include:</InfoText>
                            <InfoText>
                                • <strong>Float/Int:</strong> Numeric values (speed, health)
                                <br />• <strong>Bool:</strong> True/false flags (isGrounded)
                                <br />• <strong>Trigger:</strong> One-shot events (jump, attack)
                            </InfoText>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>ANY State (Special)</InfoSectionTitle>
                            <InfoText>
                                The ANY state is a wildcard. Transitions from ANY can trigger from{" "}
                                <em>any other state</em> in the graph. Use it for animations that should be reachable
                                from anywhere.
                            </InfoText>
                            <InfoExample>
                                Example: ANY → Death when "health = 0"
                                <br />
                                This works whether the character is idle, walking, jumping, etc.
                            </InfoExample>
                        </InfoSection>

                        <InfoSection>
                            <InfoSectionTitle>Tips</InfoSectionTitle>
                            <InfoText>
                                • Right-click a state to duplicate or remove it
                                <br />
                                • Use the AI button to auto-generate a graph from your animations
                                <br />
                                • Export/Import buttons let you backup and restore graphs
                                <br />• The Idle state is the default starting state
                            </InfoText>
                        </InfoSection>
                    </InfoPopover>
                }
                <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    style={{display: "none"}}
                    onChange={handleImportGraph}
                />
                <ActionPanel>
                    <Tooltip text="Animation Upload">
                        <ActionButton $isSelected={uploadOptionSelected}
                            onClick={() => setUploadOptionSelected(true)}
                        >
                            <img src={animationIcon}
                                alt="Upload"
                                style={{width: 20, height: 20}}
                            />
                        </ActionButton>
                    </Tooltip>
                    <Tooltip text="New Animation Group">
                        <ActionButton onClick={handleAddState}>
                            <img src={plusIcon}
                                alt="Add"
                                style={{width: 20, height: 20}}
                            />
                        </ActionButton>
                    </Tooltip>
                    <Tooltip text="Use AI to build the animation graph based on animations">
                        <ActionButton
                            $isBlue
                            onClick={() => {
                                if (!loading) handleGenerateGraph();
                            }}
                            disabled={loading}
                        >
                            <img src={magicAiIcon}
                                alt="AI"
                                style={{width: 20, height: 20}}
                            />
                        </ActionButton>
                    </Tooltip>
                    <Tooltip text="Import / Export">
                        <ActionButton
                            ref={exportBtnRef}
                            onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                handleToggleExportMenu();
                            }}
                        >
                            <img src={dotsMenuIcon}
                                alt="Menu"
                                style={{width: 20, height: 20}}
                            />
                        </ActionButton>
                    </Tooltip>
                </ActionPanel>
            </ReactFlow>
            {contextMenu.visible && contextMenu.nodeId && 
                <Menu style={{left: contextMenu.x, top: contextMenu.y}}
                    onClick={e => e.stopPropagation()}
                >
                    <MenuItem
                        onClick={() => {
                            duplicateNode(contextMenu.nodeId!);
                            setContextMenu(cm => ({...cm, visible: false}));
                        }}
                    >
                        Duplicate
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            handleRemoveState(contextMenu.nodeId!);
                            setContextMenu(cm => ({...cm, visible: false}));
                        }}
                    >
                        Remove
                    </MenuItem>
                </Menu>
            }
            {showExportMenu && 
                <Menu
                    style={{left: exportMenuPos.x, top: exportMenuPos.y}}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                >
                    <MenuItem
                        onClick={() => {
                            exportGLB();
                            setShowExportMenu(false);
                        }}
                    >
                        Export Model as GLB
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            exportGLTF();
                            setShowExportMenu(false);
                        }}
                    >
                        Export Model as GLTF
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            handleDownloadGraph();
                            setShowExportMenu(false);
                        }}
                    >
                        Download Animation Graph JSON
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            fileInputRef.current?.click();
                            setShowExportMenu(false);
                        }}
                    >
                        Import Animation Graph JSON
                    </MenuItem>
                </Menu>
            }
        </>
    );
};
