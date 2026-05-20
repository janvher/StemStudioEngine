import React from "react";
import { Behavior, BehaviorTypes, ParameterType } from "three.quarks";

import global from "@stem/editor-oss/global";
import { CollapsibleEditorSection } from "../../../common/CollapsibleEditorSection/CollapsibleEditorSection";
import { FieldEditor, FieldType } from "../../../common/FieldEditor/FieldEditor";

export interface ParticleBehaviorEditorProps {
    behavior: Behavior;
    onDelete: () => void;
}

export const ParticleBehaviorEditor: React.FC<ParticleBehaviorEditorProps> = ({ behavior, onDelete }) => {
    const app = global?.app;
    const editor = app?.editor;

    const updateProperties = () => {
        // Trigger update in the application
        if (app && editor?.selected) {
            app.call("objectChanged", editor, editor.selected);
            app.call("emitterUpdate");
        }
    };

    // Get behavior configuration
    const entry = BehaviorTypes[behavior.type];
    if (!entry) return null;

    // Create field editors for all behavior parameters except "self"
    const fieldEditors = entry.params
        .filter(([, paramTypes]) => !paramTypes.includes("self"))
        .map(([varName, paramTypes]) => {
            return (
                <FieldEditor
                    key={varName}
                    fieldName={varName}
                    target={behavior}
                    label={varName}
                    fieldType={paramTypes as FieldType}
                    value={behavior[varName as keyof Behavior]}
                    onChange={updateProperties}
                />
            );
        });

    const actions = [
        {
            label: "Delete",
            onClick: onDelete,
            variant: "delete" as const,
        },
    ];

    return (
        <CollapsibleEditorSection title={behavior.type}
            defaultExpanded
            actions={actions}
        >
            {fieldEditors}
        </CollapsibleEditorSection>
    );
};
