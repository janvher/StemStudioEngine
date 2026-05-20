import React, {useState, useEffect} from "react";
import styled from "styled-components";
import {Object3D} from "three";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {BehaviorThrottleConfig} from "../../../../../../behaviors/Behavior";
import {BehaviorThrottlePriority} from "../../../../../../behaviors/performance/interfaces/IThrottleStrategy";
import global from "@stem/editor-oss/global";
import {Tooltip} from "../../../common/Tooltip";
import type {Item} from "../../../common/BasicCombobox/BasicCombobox";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {SelectRow} from "../../common/SelectRow";
import {Separator} from "../../common/Separator";
import {PanelSectionTitle, PanelSectionTitleSecondary} from "../../RightPanel.style";

const Container = styled.div`
    margin: 8px 0;
`;

const ContentItem = styled.div`
    margin-bottom: 8px;
`;

const TooltipWrapper = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const ThrottlingLockedBanner = styled.div`
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
        content: "�";
        font-size: 16px;
    }
`;

const InfoBanner = styled.div`
    background: linear-gradient(135deg, #1a1a4a 0%, #2a2a5a 100%);
    color: #9090ee;
    padding: 10px;
    border-radius: 6px;
    font-size: var(--theme-font-size-extra-small);
    margin-bottom: 10px;
    border-left: 4px solid #4d7fff;

    &::before {
        content: "💡 ";
        font-size: var(--theme-font-size-s);
    }
`;

interface BehaviorThrottlingPanelProps {
    behaviorId: string;
    behaviorUuid: string;
}

export const BehaviorThrottlingPanel: React.FC<BehaviorThrottlingPanelProps> = ({behaviorId, behaviorUuid}) => {
    const app = global.app as EngineRuntime;
    const selected = app.editor?.selected;
    const stemDisabled = selected && app.editor?.isStemLocked(selected as Object3D);
    const [throttlePriority, setThrottlePriority] = useState<BehaviorThrottlePriority>(BehaviorThrottlePriority.MEDIUM);
    const [enableFrustumCulling, setEnableFrustumCulling] = useState<boolean>(true);
    const [enableDistanceThrottling, setEnableDistanceThrottling] = useState<boolean>(true);
    const [requiresConsistentUpdates, setRequiresConsistentUpdates] = useState<boolean>(false);
    const [isThrottlingLocked, setIsThrottlingLocked] = useState<boolean>(false);

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
    const updateBehaviorData = (updates: Partial<BehaviorThrottleConfig>) => {
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

        // Update the throttleConfig in the userData (this is what gets loaded during runtime)
        behaviorData.throttleConfig = {
            ...behaviorData.throttleConfig,
            ...updates,
        };

        // Trigger scene save/change
        app.call("objectChanged", app.editor, selected);
    };

    // Helper function to get behavior config from registry
    const getBehaviorConfig = () => {
        return app.editor?.behaviorConfigRegistry?.getConfig(behaviorId) || null;
    };

    // Load current behavior settings from scene data (not runtime behaviors)
    useEffect(() => {
        const behaviorData = getBehaviorData();
        if (!behaviorData) {
            return;
        }

        // Get default settings from behavior config first
        const behaviorConfig = getBehaviorConfig();
        const configDefaults = (behaviorConfig?.throttleConfig as BehaviorThrottleConfig) || {};

        // Then get scene-specific overrides
        const sceneThrottleConfig = (behaviorData.throttleConfig as BehaviorThrottleConfig) || {};

        // Merge config defaults with scene overrides, scene takes priority
        const finalThrottlePriority =
            sceneThrottleConfig.throttlePriority ?? configDefaults.throttlePriority ?? BehaviorThrottlePriority.MEDIUM;
        const finalFrustumCulling =
            sceneThrottleConfig.enableFrustumCulling ?? configDefaults.enableFrustumCulling ?? true;
        const finalDistanceThrottling =
            sceneThrottleConfig.enableDistanceThrottling ?? configDefaults.enableDistanceThrottling ?? true;
        const finalConsistentUpdates =
            sceneThrottleConfig.requiresConsistentUpdates ?? configDefaults.requiresConsistentUpdates ?? false;

        setThrottlePriority(finalThrottlePriority);
        setEnableFrustumCulling(finalFrustumCulling);
        setEnableDistanceThrottling(finalDistanceThrottling);
        setRequiresConsistentUpdates(finalConsistentUpdates);

        // Check if throttling is locked for this behavior type
        setIsThrottlingLocked(behaviorConfig?.isThrottlingLocked ?? false);
    }, [app, behaviorUuid, behaviorId]);

    const priorityOptions = [
        {
            key: "CRITICAL",
            value: "Critical - Always Update",
            id: BehaviorThrottlePriority.CRITICAL,
            description: "Updates every frame for essential behaviors like player controls",
        },
        {
            key: "HIGH",
            value: "High - Minimal Optimization",
            id: BehaviorThrottlePriority.HIGH,
            description: "Light performance optimization for important game elements",
        },
        {
            key: "MEDIUM",
            value: "Medium - Balanced",
            id: BehaviorThrottlePriority.MEDIUM,
            description: "Good balance of performance and responsiveness",
        },
        {
            key: "LOW",
            value: "Low - Performance Focused",
            id: BehaviorThrottlePriority.LOW,
            description: "Prioritizes performance over frequent updates",
        },
        {
            key: "MINIMAL",
            value: "Minimal - Maximum Optimization",
            id: BehaviorThrottlePriority.MINIMAL,
            description: "Heavy optimization for background or decorative elements",
        },
    ];

    const selectedPriority = priorityOptions.find(option => option.id === throttlePriority) || priorityOptions[2];

    const updateBehaviorSetting = (key: keyof BehaviorThrottleConfig, value: any) => {
        // Update the scene data directly (works in editor mode)
        updateBehaviorData({[key]: value});
    };

    const handlePriorityChange = (item: any) => {
        // Don't allow changes if throttling is locked or object is a stem not in edit mode
        if (isThrottlingLocked || stemDisabled) {
            return;
        }

        setThrottlePriority(item.id);

        // Prepare throttleConfig to update
        const throttleConfigUpdates: Partial<BehaviorThrottleConfig> = {
            throttlePriority: item.id,
        };

        // For CRITICAL priority, ensure all throttling is bypassed
        if (item.id === BehaviorThrottlePriority.CRITICAL) {
            throttleConfigUpdates.requiresConsistentUpdates = true;
            throttleConfigUpdates.enableFrustumCulling = false;
            throttleConfigUpdates.enableDistanceThrottling = false;

            // Update UI state
            setRequiresConsistentUpdates(true);
            setEnableFrustumCulling(false);
            setEnableDistanceThrottling(false);
        }

        // Update the scene data directly (works in editor mode)
        updateBehaviorData(throttleConfigUpdates);
    };

    const handleFrustumCullingChange = (e: React.ChangeEvent<HTMLInputElement | undefined>) => {
        if (isThrottlingLocked || stemDisabled || !e.target) {
            return;
        }
        const checked = e.target.checked;
        setEnableFrustumCulling(checked);
        updateBehaviorSetting("enableFrustumCulling", checked);
    };

    const handleDistanceThrottlingChange = (e: React.ChangeEvent<HTMLInputElement | undefined>) => {
        if (isThrottlingLocked || stemDisabled || !e.target) {
            return;
        }
        const checked = e.target.checked;
        setEnableDistanceThrottling(checked);
        updateBehaviorSetting("enableDistanceThrottling", checked);
    };

    const handleConsistentUpdatesChange = (e: React.ChangeEvent<HTMLInputElement | undefined>) => {
        if (isThrottlingLocked || stemDisabled || !e.target) {
            return;
        }
        const checked = e.target.checked;
        setRequiresConsistentUpdates(checked);
        updateBehaviorSetting("requiresConsistentUpdates", checked);
    };

    return (
        <Container>
            <Separator margin="8px 0" />
            <ContentItem>
                <PanelSectionTitle>Performance Optimization</PanelSectionTitle>
            </ContentItem>

            <InfoBanner>
                These settings control how often this behavior updates to optimize game performance. Higher priority
                behaviors update more frequently.
            </InfoBanner>

            {isThrottlingLocked && (
                <ThrottlingLockedBanner>
                    <div>
                        <strong>Throttling Settings Locked</strong>
                        <br />
                        Performance settings for this behavior are defined in the behavior configuration and cannot be
                        modified.
                    </div>
                </ThrottlingLockedBanner>
            )}
            {stemDisabled && (
                <ThrottlingLockedBanner>
                    <div>
                        <strong>Throttling Settings Locked</strong>
                        <br />
                        Stem needs to be in edit mode to update these settings.
                    </div>
                </ThrottlingLockedBanner>
            )}

            <ContentItem>
                <TooltipWrapper>
                    <PanelSectionTitleSecondary>Update Priority</PanelSectionTitleSecondary>
                    <Tooltip
                        text={`Controls update frequency for performance optimization:\n• Critical: Every frame (essential behaviors)\n• High: Minimal throttling (important elements)\n• Medium: Balanced optimization\n• Low: Performance focused\n• Minimal: Maximum optimization`}
                        width="280px"
                    />
                </TooltipWrapper>
                <SelectRow
                    label=""
                    value={selectedPriority}
                    data={(isThrottlingLocked || stemDisabled ? [selectedPriority].filter(Boolean) : priorityOptions) as Item[]}
                    onChange={handlePriorityChange}
                    $margin="4px 0 8px 0"
                />
                {!isThrottlingLocked && !stemDisabled && (
                    <div style={{fontSize: "10px", color: "#888", marginTop: "4px", fontStyle: "italic"}}>
                        {selectedPriority?.description}
                    </div>
                )}
            </ContentItem>

            <ContentItem>
                <TooltipWrapper>
                    <Tooltip
                        text="Pauses updates when the object is outside the camera view to improve performance. Reduces processing when object is not visible."
                        width="220px"
                    />
                    <PanelCheckbox
                        v2
                        text="Off-Screen Optimization"
                        checked={enableFrustumCulling}
                        isGray
                        regular
                        disabled={isThrottlingLocked || stemDisabled}
                        onChange={handleFrustumCullingChange}
                    />
                </TooltipWrapper>
            </ContentItem>

            <ContentItem>
                <TooltipWrapper>
                    <Tooltip
                        text="Reduces update frequency for objects far from the camera. Closer objects update more often than distant ones."
                        width="220px"
                    />
                    <PanelCheckbox
                        v2
                        text="Distance-Based Optimization"
                        checked={enableDistanceThrottling}
                        isGray
                        regular
                        disabled={isThrottlingLocked || stemDisabled}
                        onChange={handleDistanceThrottlingChange}
                    />
                </TooltipWrapper>
            </ContentItem>

            <ContentItem>
                <TooltipWrapper>
                    <Tooltip
                        text="Forces this behavior to update every frame, overriding all performance optimizations. Use for behaviors that need precise timing."
                        width="240px"
                    />
                    <PanelCheckbox
                        v2
                        text="Force Consistent Updates"
                        checked={requiresConsistentUpdates}
                        isGray
                        regular
                        disabled={isThrottlingLocked || stemDisabled}
                        onChange={handleConsistentUpdatesChange}
                    />
                </TooltipWrapper>
            </ContentItem>
        </Container>
    );
};
