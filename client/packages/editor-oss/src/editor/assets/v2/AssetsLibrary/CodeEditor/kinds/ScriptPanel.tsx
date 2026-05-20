import React, {useCallback} from "react";

import {buildBehaviorCreatorRevisionActions} from "../../BehaviorCreator/BehaviorConfigEditor/buildBehaviorCreatorRevisionActions";
import {
    SectionTitle,
    DetailsData,
    Property,
    Label,
    Input,
} from "../../BehaviorCreator/BehaviorCreator.style";
import {RevisionSection} from "../../RevisionSection/RevisionSection";
import type {AssetTreeEntry} from "../hooks/useAssetTree";
import type {ScriptModification} from "../hooks/useCodeEditorState";

export interface ScriptPanelProps {
    entry: AssetTreeEntry;
    revisionId: string;
    /** Scene's pinned revision — marked `(Scene)` in the row list. */
    sceneRevisionId?: string;
    name?: string;
    disabled?: boolean;
    onUpdate: (id: string, changes: ScriptModification, baseRevisionId: string) => void;
    /** Apply a revision to the scene (destructive — replaces the running version). */
    onApplyRevisionToScene?: (event: React.MouseEvent, revisionId: string) => void;
    /** Load a revision into the editor only (non-destructive — scene unaffected). */
    onOpenRevisionInEditor?: (revisionId: string) => void;
}

export const ScriptPanel: React.FC<ScriptPanelProps> = ({
    entry,
    revisionId,
    sceneRevisionId,
    name,
    disabled,
    onUpdate,
    onApplyRevisionToScene,
    onOpenRevisionInEditor,
}) => {
    const handleNameChange = useCallback(
        (value: string) => {
            onUpdate(entry.id, {name: value}, revisionId);
        },
        [entry.id, onUpdate, revisionId],
    );

    return (
        <div style={{width: "100%", ...(disabled && {pointerEvents: "none", opacity: 0.5})}}>
            <SectionTitle>
                <span className="title">Script</span>
            </SectionTitle>
            <DetailsData>
                <Property>
                    <Label>Name</Label>
                    <Input value={name || ""} setValue={handleNameChange} placeholder="Script name" />
                </Property>
                <Property>
                    <Label>Asset ID</Label>
                    <Input value={entry.id} setValue={() => {}} placeholder="" />
                </Property>
            </DetailsData>

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
