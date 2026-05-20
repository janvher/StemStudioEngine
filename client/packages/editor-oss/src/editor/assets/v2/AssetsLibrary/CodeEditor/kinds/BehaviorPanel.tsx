/**
 * Right-panel content for behavior entries in the CodeEditor.
 *
 * Wraps the existing `BehaviorCreatorConfigEditor` and provides it with the
 * callbacks it expects, translating from the unified editor's state shape.
 * This keeps all behavior-config UI logic in one place while the shell owns
 * only the surrounding layout (ResizableSettingsPanel / RightPanel).
 */
import React, {useCallback} from "react";

import {BehaviorConfig} from "../../../../../../editor/behaviors/BehaviorConfig";
import {BehaviorCreatorConfigEditor} from "../../BehaviorCreator/BehaviorConfigEditor/BehaviorCreatorConfigEditor";
import type {BehaviorModification} from "../../BehaviorCreator/hooks/useBehaviorEditorState";
import type {AssetTreeEntry} from "../hooks/useAssetTree";

export interface BehaviorPanelProps {
    entry: AssetTreeEntry;
    /** Current head or scene-pinned revision. */
    revisionId: string;
    sceneRevisionId?: string;
    /** The server-side behavior config (may be overlaid by unsaved changes). */
    config?: BehaviorConfig;
    /** Current code string (used by AI assistant, currently disabled). */
    code?: string;
    /** Current name (may include unsaved draft name). */
    name?: string;
    description?: string;
    documentation?: string;
    tags?: string[];
    disabled?: boolean;
    /** Push a partial modification into the unified editor's behavior draft map. */
    onUpdate: (id: string, changes: BehaviorModification, baseRevisionId: string) => void;
    onApplyRevisionToScene?: (event: React.MouseEvent, revisionId: string) => void;
    onOpenRevisionInEditor?: (revisionId: string) => void;
}

export const BehaviorPanel: React.FC<BehaviorPanelProps> = ({
    entry,
    revisionId,
    sceneRevisionId,
    config,
    code,
    name,
    description,
    documentation,
    tags,
    disabled,
    onUpdate,
    onApplyRevisionToScene,
    onOpenRevisionInEditor,
}) => {
    const handleNameChange = useCallback(
        (_behaviorId: string, _revisionId: string, value: string) => {
            onUpdate(entry.id, {name: value}, revisionId);
        },
        [entry.id, revisionId, onUpdate],
    );

    const handleDescriptionChange = useCallback(
        (_behaviorId: string, _revisionId: string, value: string) => {
            onUpdate(entry.id, {description: value}, revisionId);
        },
        [entry.id, revisionId, onUpdate],
    );

    const handleDocumentationChange = useCallback(
        (value: string) => {
            // Documentation lives inside BehaviorConfig, not as a top-level field.
            onUpdate(
                entry.id,
                {config: {...config, documentation: value} as BehaviorConfig},
                revisionId,
            );
        },
        [entry.id, revisionId, config, onUpdate],
    );

    const handleTagsChange = useCallback(
        (args: {behaviorId: string; revisionId: string; tagsToAdd?: string[]; tagToRemove?: string}) => {
            const currentTags = tags ?? [];
            let nextTags: string[];
            if (args.tagsToAdd) {
                nextTags = [...currentTags, ...args.tagsToAdd.filter(t => !currentTags.includes(t))];
            } else if (args.tagToRemove) {
                nextTags = currentTags.filter(t => t !== args.tagToRemove);
            } else {
                return;
            }
            onUpdate(entry.id, {tags: nextTags}, revisionId);
        },
        [entry.id, revisionId, tags, onUpdate],
    );

    const handleConfigChange = useCallback(
        (_behaviorId: string, _revisionId: string, nextConfig: BehaviorConfig) => {
            onUpdate(entry.id, {config: nextConfig}, revisionId);
        },
        [entry.id, revisionId, onUpdate],
    );

    const handleCodeChange = useCallback(
        (_behaviorId: string, _revisionId: string, value: string) => {
            onUpdate(entry.id, {code: value}, revisionId);
        },
        [entry.id, revisionId, onUpdate],
    );

    return (
        <BehaviorCreatorConfigEditor
            behaviorId={entry.id}
            revisionId={revisionId}
            sceneRevisionId={sceneRevisionId}
            name={name}
            tags={tags}
            description={description}
            documentation={documentation}
            config={config}
            code={code}
            disabled={disabled ?? entry.isReadOnly}
            onNameChange={handleNameChange}
            onDescriptionChange={handleDescriptionChange}
            onDocumentationChange={handleDocumentationChange}
            onTagsChange={handleTagsChange}
            onConfigChange={handleConfigChange}
            onCodeChange={handleCodeChange}
            onApplyRevisionToScene={onApplyRevisionToScene}
            onOpenRevisionInEditor={onOpenRevisionInEditor}
        />
    );
};
