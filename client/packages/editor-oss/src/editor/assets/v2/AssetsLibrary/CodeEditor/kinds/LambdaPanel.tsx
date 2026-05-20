/**
 * Right-panel content for lambda entries in the CodeEditor.
 *
 * Replicates the ConfigPanel section from the existing LambdaEditor — name,
 * description, schema attributes, lambda-level attributes, revision section —
 * but wired to the unified editor's state delegates instead of inline state.
 */
import React, {useCallback, useState} from "react";

import {AttributesSection} from "../../BehaviorCreator/AttributesSection/AttributesSection";
import {buildBehaviorCreatorRevisionActions} from "../../BehaviorCreator/BehaviorConfigEditor/buildBehaviorCreatorRevisionActions";
import {
    SectionTitle,
    DetailsData,
    Property,
    Label,
    Input,
    ExpandButton,
} from "../../BehaviorCreator/BehaviorCreator.style";
import type {IAttribute} from "../../BehaviorCreator/types";
import arrowDown from "../../images/arrow-down.svg";
import {RevisionSection} from "../../RevisionSection/RevisionSection";
import type {AssetTreeEntry} from "../hooks/useAssetTree";
import type {LambdaModification} from "../hooks/useCodeEditorState";

// ---------------------------------------------------------------------------
// Attribute helpers (ported from LambdaEditor inline helpers)
// ---------------------------------------------------------------------------

/**
 *
 * @param record
 */
function toAttributeArray(record: Record<string, any> | undefined): IAttribute[] {
    if (!record) return [];
    return Object.entries(record).map(([key, value]) => ({
        ...value,
        key,
    }));
}

/**
 *
 * @param attrs
 */
function toAttributeRecord(attrs: IAttribute[]): Record<string, any> {
    return attrs.reduce(
        (acc, attr, index) => {
            acc[attr.key] = {...attr, order: attr.order !== undefined ? attr.order : index};
            return acc;
        },
        {} as Record<string, any>,
    );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LambdaPanelProps {
    entry: AssetTreeEntry;
    revisionId: string;
    /** Scene's pinned revision — marked `(Scene)` in the row list. */
    sceneRevisionId?: string;
    name?: string;
    /** Parsed config object from the lambda revision data. */
    configObj?: {
        schema?: Record<string, any>;
        lambdaAttributes?: Record<string, any>;
        [key: string]: any;
    };
    disabled?: boolean;
    onUpdate: (id: string, changes: LambdaModification, baseRevisionId: string) => void;
    /** Apply a revision to the scene (destructive — replaces the running version). */
    onApplyRevisionToScene?: (event: React.MouseEvent, revisionId: string) => void;
    /** Load a revision into the editor only (non-destructive — scene unaffected). */
    onOpenRevisionInEditor?: (revisionId: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const LambdaPanel: React.FC<LambdaPanelProps> = ({
    entry,
    revisionId,
    sceneRevisionId,
    name,
    configObj,
    disabled,
    onUpdate,
    onApplyRevisionToScene,
    onOpenRevisionInEditor,
}) => {
    const [detailsExpanded, setDetailsExpanded] = useState(true);

    const schemaAttrs = toAttributeArray(configObj?.schema);
    const lambdaAttrs = toAttributeArray(configObj?.lambdaAttributes);

    const handleNameChange = useCallback(
        (value: string) => {
            onUpdate(entry.id, {name: value}, revisionId);
        },
        [entry.id, revisionId, onUpdate],
    );

    const buildConfigStr = useCallback(
        (patch: Partial<{schema: Record<string, any>; lambdaAttributes: Record<string, any>}>) => {
            const next = {...(configObj ?? {}), ...patch};
            return JSON.stringify(next);
        },
        [configObj],
    );

    const handleSchemaAttrsChange = useCallback(
        (attrs: IAttribute[]) => {
            onUpdate(entry.id, {configStr: buildConfigStr({schema: toAttributeRecord(attrs)})}, revisionId);
        },
        [entry.id, revisionId, onUpdate, buildConfigStr],
    );

    const handleLambdaAttrsChange = useCallback(
        (attrs: IAttribute[]) => {
            onUpdate(entry.id, {configStr: buildConfigStr({lambdaAttributes: toAttributeRecord(attrs)})}, revisionId);
        },
        [entry.id, revisionId, onUpdate, buildConfigStr],
    );

    const isDisabled = disabled ?? entry.isReadOnly;

    return (
        <div style={{width: "100%", ...(isDisabled && {pointerEvents: "none", opacity: 0.5})}}>
            <SectionTitle onClick={() => setDetailsExpanded(prev => !prev)}>
                <span className="title">Lambda Details</span>
                <ExpandButton className="reset-css" $expanded={detailsExpanded}>
                    <img src={arrowDown} alt="show more" />
                </ExpandButton>
            </SectionTitle>
            {detailsExpanded && (
                <DetailsData>
                    <Property>
                        <Label>Name</Label>
                        <Input
                            value={name || ""}
                            setValue={handleNameChange}
                            placeholder="Lambda name"
                        />
                    </Property>
                    <Property>
                        <Label>ID</Label>
                        <Input value={entry.id} setValue={() => {}} placeholder="" />
                    </Property>
                </DetailsData>
            )}

            <AttributesSection
                label="Add Object-Specific Attributes"
                attributes={schemaAttrs}
                setAttributes={handleSchemaAttrsChange}
                hideNameField
            />

            <AttributesSection
                label="Add Lambda-Level Attributes"
                attributes={lambdaAttrs}
                setAttributes={handleLambdaAttrsChange}
            />

            <RevisionSection
                assetId={entry.id}
                currentRevisionId={revisionId}
                sceneRevisionId={sceneRevisionId}
                getLoadActions={ctx =>
                    buildBehaviorCreatorRevisionActions(ctx, {
                        sceneRevisionId,
                        onOpenRevisionInEditor,
                        onApplyRevisionToScene,
                    })
                }
                showDiffOption
            />
        </div>
    );
};
