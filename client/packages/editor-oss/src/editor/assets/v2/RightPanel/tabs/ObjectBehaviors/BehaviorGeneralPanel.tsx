import React, {useState, useEffect} from "react";
import styled from "styled-components";
import {Object3D} from "three";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import {Tooltip} from "../../../common/Tooltip";
import {NumericInputRow} from "../../common/NumericInputRow";
import {PanelSectionTitle, PanelSectionTitleSecondary} from "../../RightPanel.style";

const ContentItem = styled.div`
    margin-bottom: 8px;
`;

const TooltipWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const PriorityLockedBanner = styled.div`
    background: linear-gradient(135deg, #4a1a1a 0%, #5a2a2a 100%);
    color: #ee9090;
    padding: 12px;
    border-radius: 6px;
    font-size: 12px;
    margin-bottom: 12px;
    border-left: 4px solid #ff4d4d;
    display: flex;
    align-items: center;
    gap: 8px;

    &::before {
        content: "🔒";
        font-size: 16px;
    }
`;

interface BehaviorGeneralPanelProps {
    behaviorId: string;
    behaviorUuid: string;
}

export const BehaviorGeneralPanel: React.FC<BehaviorGeneralPanelProps> = ({behaviorId, behaviorUuid}) => {
    const app = global.app as EngineRuntime;
    const selected = app.editor?.selected;
    const stemDisabled = selected && app.editor?.isStemLocked(selected as Object3D);
    const [behaviorPriority, setBehaviorPriority] = useState<number>(0);
    const [isPriorityLocked, setIsPriorityLocked] = useState<boolean>(false);

    // Helper function to get behavior data from scene userData
    const getBehaviorData = () => {
        const selected = app.editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return null;
        }

        if (!selected.userData || !selected.userData.behaviors) {
            return null;
        }

        return selected.userData.behaviors.find((b: any) => b.uuid === behaviorUuid);
    };

    // Helper function to update behavior data in scene userData
    const updateBehaviorData = (updates: {priority?: number}) => {
        const selected = app.editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return;
        }

        if (!selected.userData || !selected.userData.behaviors) {
            return;
        }

        const behaviorIndex = selected.userData.behaviors.findIndex((b: any) => b.uuid === behaviorUuid);
        if (behaviorIndex === -1) {
            return;
        }

        const behaviorData = selected.userData.behaviors[behaviorIndex];

        // Update the priority field directly
        if (updates.priority !== undefined) {
            behaviorData.priority = updates.priority;
        }

        // Trigger scene save/change
        app.call("objectChanged", app.editor, selected);
    };

    // Helper function to get behavior config from registry
    const getBehaviorConfig = () => {
        return app.editor?.behaviorConfigRegistry?.getConfig(behaviorId) || null;
    };

    // Load current behavior settings from scene data
    useEffect(() => {
        const behaviorData = getBehaviorData();
        if (!behaviorData) {
            return;
        }

        // Get default settings from behavior config first
        const behaviorConfig = getBehaviorConfig();

        // Set behavior priority from behaviorData
        setBehaviorPriority(behaviorData.priority ?? behaviorConfig?.priority ?? 0);

        // Check if priority is locked for this behavior type
        setIsPriorityLocked(behaviorConfig?.isPriorityLocked ?? false);
    }, [app, behaviorUuid, behaviorId]);

    const handleBehaviorPriorityChange = (value: number) => {
        // Don't allow changes if priority is locked
        if (isPriorityLocked) {
            return;
        }

        setBehaviorPriority(value);
        updateBehaviorData({priority: value});
    };

    return (
        <div>
            <ContentItem>
                <PanelSectionTitle>Behavior Settings</PanelSectionTitle>
            </ContentItem>

            {isPriorityLocked && (
                <PriorityLockedBanner>
                    <div>
                        <strong>Priority Settings Locked</strong>
                        <br />
                        Execution priority for this behavior is defined in the behavior configuration and cannot be
                        modified.
                    </div>
                </PriorityLockedBanner>
            )}

            <ContentItem>
                <TooltipWrapper>
                    <PanelSectionTitleSecondary>Execution Priority</PanelSectionTitleSecondary>
                    <Tooltip
                        text="Controls the execution order of behaviors. Higher priority behaviors execute first. Default is 0."
                        width="280px"
                    />
                </TooltipWrapper>
                <NumericInputRow
                    label=""
                    value={behaviorPriority}
                    setValue={handleBehaviorPriorityChange}
                    disabled={isPriorityLocked || stemDisabled}
                    $margin="4px 0 8px 0"
                    min={-999}
                    max={999}
                />
                {!isPriorityLocked ? (
                    <div style={{fontSize: "10px", color: "#888", marginTop: "4px", fontStyle: "italic"}}>
                        Lower values execute first (default: 0)
                    </div>
                ) : (
                    <div style={{fontSize: "10px", color: "#ff6b6b", marginTop: "4px", fontStyle: "italic"}}>
                        Priority is locked by behavior configuration
                    </div>
                )}
            </ContentItem>
        </div>
    );
};
