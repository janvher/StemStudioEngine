import React, {useEffect, useMemo, useState} from "react";
import styled from "styled-components";
import * as THREE from "three";

import {GLOBAL_BEHAVIOR_HOST} from "../../EngineRuntime";

export type HierarchyNode = {
    uuid: string;
    name: string;
    type: string;
    visible: boolean;
    children: HierarchyNode[];
};

const POLL_INTERVAL_MS = 250;

const isHiddenObject = (obj: THREE.Object3D): boolean => {
    if (obj.type === "Box3Helper") return true;
    if (obj.name === GLOBAL_BEHAVIOR_HOST) return true;
    return false;
};

const buildNode = (obj: THREE.Object3D): HierarchyNode | null => {
    if (isHiddenObject(obj)) return null;
    const children: HierarchyNode[] = [];
    for (const child of obj.children) {
        const node = buildNode(child);
        if (node) children.push(node);
    }
    return {
        uuid: obj.uuid,
        name: obj.name || obj.type || "(unnamed)",
        type: obj.type,
        visible: obj.visible,
        children,
    };
};

const collectUuids = (nodes: HierarchyNode[], out: string[]): void => {
    for (const n of nodes) {
        out.push(n.uuid);
        collectUuids(n.children, out);
    }
};

const sameShape = (a: HierarchyNode[], b: HierarchyNode[]): boolean => {
    const aIds: string[] = [];
    const bIds: string[] = [];
    collectUuids(a, aIds);
    collectUuids(b, bIds);
    if (aIds.length !== bIds.length) return false;
    for (let i = 0; i < aIds.length; i++) {
        if (aIds[i] !== bIds[i]) return false;
    }
    return true;
};

// Filter result: visible node, plus a flag indicating whether the match was on
// this node directly (so we can highlight it). Hits propagate to ancestors so
// the matching subtree stays reachable in the tree.
type FilteredNode = Omit<HierarchyNode, "children"> & {
    matched: boolean;
    hasMatchInSubtree: boolean;
    children: FilteredNode[];
};

const applyFilter = (
    nodes: HierarchyNode[],
    query: string,
    hideInactive: boolean,
): FilteredNode[] => {
    const lowered = query.trim().toLowerCase();
    const hasQuery = lowered.length > 0;

    const visit = (n: HierarchyNode): FilteredNode | null => {
        if (hideInactive && !n.visible) return null;

        const filteredChildren: FilteredNode[] = [];
        for (const c of n.children) {
            const f = visit(c);
            if (f) filteredChildren.push(f);
        }

        const matched = hasQuery && n.name.toLowerCase().includes(lowered);
        const hasMatchInSubtree = matched || filteredChildren.some(c => c.hasMatchInSubtree);

        if (hasQuery && !hasMatchInSubtree) return null;

        return {
            ...n,
            children: filteredChildren,
            matched,
            hasMatchInSubtree,
        };
    };

    const out: FilteredNode[] = [];
    for (const n of nodes) {
        const f = visit(n);
        if (f) out.push(f);
    }
    return out;
};

type Props = {
    sceneProvider: () => THREE.Scene | null;
    selectedUuid: string | null;
    onSelect: (uuid: string) => void;
    query: string;
    hideInactive: boolean;
};

export const PlaymodeHierarchy: React.FC<Props> = ({
    sceneProvider,
    selectedUuid,
    onSelect,
    query,
    hideInactive,
}) => {
    const [nodes, setNodes] = useState<HierarchyNode[]>([]);

    useEffect(() => {
        let cancelled = false;
        const poll = () => {
            if (cancelled) return;
            const scene = sceneProvider();
            if (scene) {
                const next: HierarchyNode[] = [];
                for (const child of scene.children) {
                    const node = buildNode(child);
                    if (node) next.push(node);
                }
                setNodes(prev => (sameShape(prev, next) ? prev : next));
            }
        };
        poll();
        const id = window.setInterval(poll, POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [sceneProvider]);

    const filtered = useMemo(() => applyFilter(nodes, query, hideInactive), [nodes, query, hideInactive]);
    const filtering = query.trim().length > 0;

    return (
        <List>
            {filtered.map(node => (
                <NodeRow
                    key={node.uuid}
                    node={node}
                    depth={0}
                    selectedUuid={selectedUuid}
                    onSelect={onSelect}
                    forceExpand={filtering}
                />
            ))}
            {filtered.length === 0 && (
                <Empty>
                    {nodes.length === 0
                        ? "No objects in scene"
                        : filtering
                          ? `No matches for "${query}"`
                          : "All objects hidden"}
                </Empty>
            )}
        </List>
    );
};

type NodeRowProps = {
    node: FilteredNode;
    depth: number;
    selectedUuid: string | null;
    onSelect: (uuid: string) => void;
    forceExpand: boolean;
};

const NodeRow: React.FC<NodeRowProps> = ({node, depth, selectedUuid, onSelect, forceExpand}) => {
    const [expanded, setExpanded] = useState(depth < 1);
    const hasChildren = node.children.length > 0;
    const isSelected = node.uuid === selectedUuid;
    const showChildren = (expanded || forceExpand) && hasChildren;

    return (
        <>
            <Row
                $depth={depth}
                $selected={isSelected}
                $matched={node.matched}
                $dim={!node.visible}
                onClick={e => {
                    e.stopPropagation();
                    onSelect(node.uuid);
                }}
            >
                <Toggle
                    onClick={e => {
                        e.stopPropagation();
                        if (hasChildren) setExpanded(v => !v);
                    }}
                    $hasChildren={hasChildren}
                >
                    {hasChildren ? (showChildren ? "▾" : "▸") : "·"}
                </Toggle>
                <Name title={`${node.name} · ${node.type}`}>{node.name}</Name>
                {hasChildren && <CountBadge>{node.children.length}</CountBadge>}
                <Type>{node.type}</Type>
            </Row>
            {showChildren &&
                node.children.map(child => (
                    <NodeRow
                        key={child.uuid}
                        node={child}
                        depth={depth + 1}
                        selectedUuid={selectedUuid}
                        onSelect={onSelect}
                        forceExpand={forceExpand}
                    />
                ))}
        </>
    );
};

const List = styled.div`
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
`;

const Empty = styled.div`
    padding: 12px;
    color: #888;
    font-size: 11px;
    text-align: center;
`;

const Row = styled.div<{$depth: number; $selected: boolean; $matched: boolean; $dim: boolean}>`
    display: flex;
    align-items: center;
    padding: 2px 6px 2px ${p => 6 + p.$depth * 12}px;
    cursor: pointer;
    font-size: 12px;
    color: ${p => (p.$dim ? "#666" : "#ddd")};
    background: ${p =>
        p.$selected ? "rgba(0, 153, 255, 0.25)" : p.$matched ? "rgba(255, 200, 60, 0.10)" : "transparent"};
    border-left: 2px solid
        ${p => (p.$selected ? "#0099ff" : p.$matched ? "rgba(255, 200, 60, 0.6)" : "transparent")};
    user-select: none;

    &:hover {
        background: ${p =>
            p.$selected ? "rgba(0, 153, 255, 0.30)" : p.$matched ? "rgba(255, 200, 60, 0.18)" : "rgba(255, 255, 255, 0.06)"};
    }
`;

const Toggle = styled.span<{$hasChildren: boolean}>`
    width: 12px;
    color: ${p => (p.$hasChildren ? "#aaa" : "#444")};
    font-size: 10px;
    text-align: center;
    margin-right: 4px;
`;

const Name = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const CountBadge = styled.span`
    font-size: 9px;
    color: #777;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 0 5px;
    margin-left: 4px;
    min-width: 14px;
    text-align: center;
`;

const Type = styled.span`
    font-size: 10px;
    color: #888;
    margin-left: 6px;
`;

// Re-exported so the palette can build its searchable index without re-walking.
export const collectFlatList = (nodes: HierarchyNode[]): {uuid: string; name: string; type: string}[] => {
    const out: {uuid: string; name: string; type: string}[] = [];
    const visit = (n: HierarchyNode) => {
        out.push({uuid: n.uuid, name: n.name, type: n.type});
        for (const c of n.children) visit(c);
    };
    for (const n of nodes) visit(n);
    return out;
};

export const buildHierarchyTree = (scene: THREE.Scene): HierarchyNode[] => {
    const out: HierarchyNode[] = [];
    for (const child of scene.children) {
        const node = buildNode(child);
        if (node) out.push(node);
    }
    return out;
};
