import React, {useEffect, useMemo, useState} from "react";
import styled from "styled-components";
import * as THREE from "three";

import {Behavior} from "../../behaviors/Behavior";
import GameManager from "../../behaviors/game/GameManager";

const REFRESH_INTERVAL_MS = 100;

type Props = {
    object: THREE.Object3D | null;
    game: GameManager | null;
    query: string;
};

export const PlaymodeProperties: React.FC<Props> = ({object, game, query}) => {
    if (!object) {
        return <Empty>Select an object in the hierarchy to inspect.</Empty>;
    }

    return (
        <Wrapper>
            <Header>
                <Name>{object.name || object.type}</Name>
                <Sub>
                    {object.type} · <code>{object.uuid.slice(0, 8)}</code>
                </Sub>
            </Header>
            <TransformSection object={object} query={query} />
            <BehaviorsSection object={object} game={game} query={query} />
        </Wrapper>
    );
};

// ---------------- Transform ----------------

const TRANSFORM_KEYS = ["position", "rotation", "scale"] as const;

const TransformSection: React.FC<{object: THREE.Object3D; query: string}> = ({object, query}) => {
    const [, forceTick] = useState(0);
    const [activeField, setActiveField] = useState<string | null>(null);

    useEffect(() => {
        const id = window.setInterval(() => {
            if (activeField === null) forceTick(n => n + 1);
        }, REFRESH_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [activeField]);

    const lowered = query.trim().toLowerCase();
    const visibleKeys = lowered.length === 0 ? TRANSFORM_KEYS : TRANSFORM_KEYS.filter(k => k.includes(lowered));
    if (visibleKeys.length === 0) return null;

    const position = object.position;
    const scale = object.scale;
    const euler = object.rotation;

    const writePosition = (axis: "x" | "y" | "z", value: number) => {
        position[axis] = value;
        object.updateMatrix();
    };
    const writeScale = (axis: "x" | "y" | "z", value: number) => {
        scale[axis] = value;
        object.updateMatrix();
    };
    const writeRotation = (axis: "x" | "y" | "z", valueDeg: number) => {
        euler[axis] = THREE.MathUtils.degToRad(valueDeg);
        object.updateMatrix();
    };

    return (
        <Section>
            <StickyTitle>
                Transform <CountChip>{visibleKeys.length}</CountChip>
            </StickyTitle>
            {visibleKeys.includes("position") && (
                <Vector3Row
                    label="Position"
                    values={[position.x, position.y, position.z]}
                    onChange={(axis, v) => writePosition(axis, v)}
                    onFocusChange={field => setActiveField(field ? `pos.${field}` : null)}
                />
            )}
            {visibleKeys.includes("rotation") && (
                <Vector3Row
                    label="Rotation°"
                    values={[
                        THREE.MathUtils.radToDeg(euler.x),
                        THREE.MathUtils.radToDeg(euler.y),
                        THREE.MathUtils.radToDeg(euler.z),
                    ]}
                    onChange={(axis, v) => writeRotation(axis, v)}
                    onFocusChange={field => setActiveField(field ? `rot.${field}` : null)}
                />
            )}
            {visibleKeys.includes("scale") && (
                <Vector3Row
                    label="Scale"
                    values={[scale.x, scale.y, scale.z]}
                    onChange={(axis, v) => writeScale(axis, v)}
                    onFocusChange={field => setActiveField(field ? `scl.${field}` : null)}
                />
            )}
        </Section>
    );
};

// ---------------- Behaviors ----------------

const BehaviorsSection: React.FC<{object: THREE.Object3D; game: GameManager | null; query: string}> = ({
    object,
    game,
    query,
}) => {
    const behaviors = useMemo<Behavior[]>(() => {
        if (!game?.behaviorManager) return [];
        return game.behaviorManager.getTargetBehaviors(object) ?? [];
    }, [object, game]);

    const lowered = query.trim().toLowerCase();
    const filtering = lowered.length > 0;

    // Pre-filter so we can hide behaviors with zero matching attrs while filtering.
    const filteredBehaviors = useMemo(() => {
        return behaviors
            .map(b => {
                const allKeys = Object.keys(b.attributes ?? {});
                const matchedKeys = filtering
                    ? allKeys.filter(k => k.toLowerCase().includes(lowered) || b.id.toLowerCase().includes(lowered))
                    : allKeys;
                return {behavior: b, allKeys, matchedKeys};
            })
            .filter(entry => !filtering || entry.matchedKeys.length > 0);
    }, [behaviors, lowered, filtering]);

    return (
        <Section>
            <StickyTitle>
                Behaviors <CountChip>{filteredBehaviors.length}</CountChip>
            </StickyTitle>
            {filteredBehaviors.length === 0 && (
                <Hint>{filtering ? `No attributes match "${query}"` : "No behaviors attached."}</Hint>
            )}
            {filteredBehaviors.map(({behavior, allKeys, matchedKeys}) => (
                <BehaviorBlock
                    key={behavior.uuid}
                    behavior={behavior}
                    visibleKeys={matchedKeys}
                    totalKeys={allKeys.length}
                />
            ))}
        </Section>
    );
};

const BehaviorBlock: React.FC<{behavior: Behavior; visibleKeys: string[]; totalKeys: number}> = ({
    behavior,
    visibleKeys,
    totalKeys,
}) => {
    // Empty behaviors start collapsed; behaviors with attributes start expanded.
    const [expanded, setExpanded] = useState(totalKeys > 0);
    const [, forceTick] = useState(0);
    const [activeKey, setActiveKey] = useState<string | null>(null);

    useEffect(() => {
        const id = window.setInterval(() => {
            if (activeKey === null) forceTick(n => n + 1);
        }, REFRESH_INTERVAL_MS);
        return () => window.clearInterval(id);
    }, [activeKey]);

    const attributes = behavior.attributes ?? {};
    const isEmpty = totalKeys === 0;

    return (
        <BehaviorCard>
            <BehaviorHeader onClick={() => setExpanded(v => !v)} $empty={isEmpty}>
                <span>{expanded ? "▾" : "▸"}</span>
                <BehaviorName>{behavior.id}</BehaviorName>
                <Sub>
                    {visibleKeys.length === totalKeys
                        ? `${totalKeys} attr${totalKeys === 1 ? "" : "s"}`
                        : `${visibleKeys.length}/${totalKeys}`}
                </Sub>
            </BehaviorHeader>
            {expanded && (
                <AttrList>
                    {isEmpty && <Hint>No attributes exposed.</Hint>}
                    {visibleKeys.map(key => (
                        <AttributeRow
                            key={key}
                            attrKey={key}
                            value={attributes[key]}
                            onCommit={value => {
                                try {
                                    void behavior.requestAttributeChange(key, value);
                                } catch (err) {
                                    console.warn(`[Playmode Inspector] requestAttributeChange failed for ${key}`, err);
                                }
                            }}
                            onFocusChange={focused => setActiveKey(focused ? key : null)}
                        />
                    ))}
                </AttrList>
            )}
        </BehaviorCard>
    );
};

const AttributeRow: React.FC<{
    attrKey: string;
    value: unknown;
    onCommit: (value: unknown) => void;
    onFocusChange: (focused: boolean) => void;
}> = ({attrKey, value, onCommit, onFocusChange}) => {
    if (typeof value === "number") {
        return (
            <Row>
                <AttrLabel title={attrKey}>{attrKey}</AttrLabel>
                <NumberInput
                    value={value}
                    onCommit={v => onCommit(v)}
                    onFocusChange={onFocusChange}
                />
            </Row>
        );
    }

    if (typeof value === "boolean") {
        return (
            <Row>
                <AttrLabel title={attrKey}>{attrKey}</AttrLabel>
                <CheckboxWrap>
                    <input
                        type="checkbox"
                        checked={value}
                        onChange={e => onCommit(e.target.checked)}
                    />
                </CheckboxWrap>
            </Row>
        );
    }

    if (typeof value === "string") {
        return (
            <Row>
                <AttrLabel title={attrKey}>{attrKey}</AttrLabel>
                <StringInput
                    initial={value}
                    onCommit={v => onCommit(v)}
                    onFocusChange={onFocusChange}
                />
            </Row>
        );
    }

    if (value && typeof value === "object" && "x" in value && "y" in value && "z" in value) {
        const v = value as {x: number; y: number; z: number};
        if (typeof v.x === "number" && typeof v.y === "number" && typeof v.z === "number") {
            return (
                <RowVec>
                    <AttrLabel title={attrKey}>{attrKey}</AttrLabel>
                    <Vector3Row
                        label=""
                        values={[v.x, v.y, v.z]}
                        onChange={(axis, n) => onCommit({...v, [axis]: n})}
                        onFocusChange={focused => onFocusChange(!!focused)}
                    />
                </RowVec>
            );
        }
    }

    return (
        <Row>
            <AttrLabel title={attrKey}>{attrKey}</AttrLabel>
            <ReadonlyValue>{safeStringify(value)}</ReadonlyValue>
        </Row>
    );
};

// ---------------- Inputs ----------------

const NumberInput: React.FC<{
    value: number;
    onCommit: (v: number) => void;
    onFocusChange: (focused: boolean) => void;
}> = ({value, onCommit, onFocusChange}) => {
    const [draft, setDraft] = useState<string>(String(value));
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        if (!editing) setDraft(String(value));
    }, [value, editing]);

    return (
        <BareInput
            type="number"
            value={draft}
            onFocus={() => {
                setEditing(true);
                onFocusChange(true);
            }}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => {
                setEditing(false);
                onFocusChange(false);
                const parsed = parseFloat(draft);
                if (!Number.isNaN(parsed)) onCommit(parsed);
                else setDraft(String(value));
            }}
            onKeyDown={e => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
        />
    );
};

const StringInput: React.FC<{
    initial: string;
    onCommit: (v: string) => void;
    onFocusChange: (focused: boolean) => void;
}> = ({initial, onCommit, onFocusChange}) => {
    const [draft, setDraft] = useState(initial);
    useEffect(() => setDraft(initial), [initial]);
    return (
        <BareInput
            type="text"
            value={draft}
            onFocus={() => onFocusChange(true)}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => {
                onFocusChange(false);
                if (draft !== initial) onCommit(draft);
            }}
            onKeyDown={e => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
        />
    );
};

const Vector3Row: React.FC<{
    label: string;
    values: [number, number, number];
    onChange: (axis: "x" | "y" | "z", value: number) => void;
    onFocusChange: (axis: "x" | "y" | "z" | null) => void;
}> = ({label, values, onChange, onFocusChange}) => (
    <Vec>
        {label && <AttrLabel>{label}</AttrLabel>}
        {(["x", "y", "z"] as const).map((axis, i) => (
            <AxisCell key={axis}>
                <AxisLabel>{axis.toUpperCase()}</AxisLabel>
                <NumberInput
                    value={values[i] ?? 0}
                    onCommit={v => onChange(axis, v)}
                    onFocusChange={focused => onFocusChange(focused ? axis : null)}
                />
            </AxisCell>
        ))}
    </Vec>
);

const safeStringify = (v: unknown): string => {
    try {
        const s = JSON.stringify(v);
        if (!s) return String(v);
        return s.length > 60 ? s.slice(0, 57) + "…" : s;
    } catch {
        return "(unserializable)";
    }
};

// ---------------- Styled ----------------

const Wrapper = styled.div`
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding: 0 10px 10px;
    gap: 12px;
`;

const Empty = styled.div`
    padding: 20px 12px;
    color: #888;
    font-size: 11px;
    text-align: center;
`;

const Header = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 0;
    border-bottom: 1px solid #333;
    position: sticky;
    top: 0;
    background: rgba(18, 18, 18, 0.96);
    z-index: 2;
`;

const Name = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #fff;
`;

const Sub = styled.div`
    font-size: 10px;
    color: #888;
    code {
        font-family: ui-monospace, monospace;
        font-size: 10px;
    }
`;

const Section = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const StickyTitle = styled.div`
    position: sticky;
    top: 38px;
    z-index: 1;
    background: rgba(18, 18, 18, 0.96);
    font-size: 10px;
    font-weight: 700;
    color: #aaa;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 4px 0;
    display: flex;
    align-items: center;
    gap: 6px;
`;

const CountChip = styled.span`
    font-size: 9px;
    color: #aaa;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 1px 6px;
    text-transform: none;
    font-weight: 600;
    letter-spacing: 0;
`;

const Hint = styled.div`
    color: #777;
    font-size: 11px;
    padding: 4px 0;
`;

const Row = styled.div`
    display: grid;
    grid-template-columns: 90px 1fr;
    align-items: center;
    gap: 6px;
    font-size: 11px;
`;

const RowVec = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
`;

const AttrLabel = styled.div`
    color: #bbb;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const ReadonlyValue = styled.div`
    color: #888;
    font-family: ui-monospace, monospace;
    font-size: 10px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const Vec = styled.div`
    display: flex;
    gap: 4px;
`;

const AxisCell = styled.label`
    flex: 1;
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid #333;
    border-radius: 3px;
    padding: 0 4px;
    min-width: 0;
`;

const AxisLabel = styled.span`
    color: #888;
    font-size: 10px;
    margin-right: 4px;
`;

const BareInput = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    color: #ddd;
    font-size: 11px;
    padding: 4px 4px;
    width: 100%;
    min-width: 0;
    outline: none;

    &:focus {
        color: #fff;
    }
`;

const CheckboxWrap = styled.div`
    display: flex;
    align-items: center;
`;

const BehaviorCard = styled.div`
    border: 1px solid #2a2a2a;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.03);
    overflow: hidden;
`;

const BehaviorHeader = styled.div<{$empty: boolean}>`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.05);
    user-select: none;
    opacity: ${p => (p.$empty ? 0.7 : 1)};

    span:first-child {
        color: #888;
        font-size: 10px;
        width: 10px;
    }
`;

const BehaviorName = styled.span`
    flex: 1;
    color: #ddd;
    font-size: 11px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const AttrList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px;
`;
