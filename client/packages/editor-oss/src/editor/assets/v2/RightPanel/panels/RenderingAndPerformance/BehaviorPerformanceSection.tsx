import React, { useEffect, useState } from "react";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import { BehaviorThrottleConfig } from "../../../../../../behaviors/Behavior";
import { BehaviorThrottlePriority } from "../../../../../../behaviors/performance/interfaces/IThrottleStrategy";
import global from "@stem/editor-oss/global";
import { ContentItem } from "../../common/ContentItem";
import { NumericInputRow } from "../../common/NumericInputRow";
import { PanelCheckbox } from "../../common/PanelCheckbox";
import { SelectRow } from "../../common/SelectRow";
import { Separator } from "../../common/Separator";
import { PanelSectionTitle } from "../../RightPanel.style";

interface CheckboxConfig {
    text: string;
    state: boolean;
    setter: React.Dispatch<React.SetStateAction<any>>;
    keyName: keyof BehaviorThrottleConfig;
    tooltip: string;
}

interface BehaviorThrottlingConfig {
    label: string;
    value: number;
    setter: React.Dispatch<React.SetStateAction<any>>;
    key: string;
    keySq?: string;
    tooltip: string;
}

const priorityOptions = [
    {
        key: 'CRITICAL',
        value: 'Critical - Always Update',
        id: BehaviorThrottlePriority.CRITICAL,
        description: 'Updates every frame for essential behaviors like player controls',
    },
    {
        key: 'HIGH',
        value: 'High - Minimal Optimization',
        id: BehaviorThrottlePriority.HIGH,
        description: 'Light performance optimization for important game elements',
    },
    {
        key: 'MEDIUM',
        value: 'Medium - Balanced',
        id: BehaviorThrottlePriority.MEDIUM,
        description: 'Good balance of performance and responsiveness',
    },
    {
        key: 'LOW',
        value: 'Low - Performance Focused',
        id: BehaviorThrottlePriority.LOW,
        description: 'Prioritizes performance over frequent updates',
    },
    {
        key: 'MINIMAL',
        value: 'Minimal - Maximum Optimization',
        id: BehaviorThrottlePriority.MINIMAL,
        description: 'Heavy optimization for background or decorative elements',
    },
];

// Default values for behavior throttling UI (user-friendly distances)
const DEFAULT_FAR_DISTANCE = 50;
const DEFAULT_VERY_FAR_DISTANCE = 100;
const DEFAULT_FAR_THROTTLE_FACTOR = 3;
const DEFAULT_VERY_FAR_THROTTLE_FACTOR = 10;

/**
 *
 */
export default function BehaviorPerformanceSection() {
    const app = global?.app as EngineRuntime;
    const globalSettings = app?.editor?.scene?.userData?.behaviorsSettings || {};
    const [throttlePriority, setThrottlePriority] = useState<BehaviorThrottlePriority>(globalSettings?.throttlePriority || BehaviorThrottlePriority.MEDIUM);
    const [enableFrustumCulling, setEnableFrustumCulling] = useState<boolean>(!!globalSettings.enableFrustumCulling);
    const [enableDistanceThrottling, setEnableDistanceThrottling] = useState<boolean>(!!globalSettings.enableDistanceThrottling);
    const [requiresConsistentUpdates, setRequiresConsistentUpdates] = useState<boolean>(!!globalSettings.requiresConsistentUpdates);

    const cfg = app?.editor?.scene?.userData?.behaviorThrottlingConfig || {};
    const [farDistance, setFarDistance] = useState(cfg.farDistance ?? DEFAULT_FAR_DISTANCE);
    const [veryFarDistance, setVeryFarDistance] = useState(cfg.veryFarDistance ?? DEFAULT_VERY_FAR_DISTANCE);
    const [farThrottleFactor, setFarThrottleFactor] = useState(cfg.farThrottleFactor ?? DEFAULT_FAR_THROTTLE_FACTOR);
    const [veryFarThrottleFactor, setVeryFarThrottleFactor] = useState(cfg.veryFarThrottleFactor ?? DEFAULT_VERY_FAR_THROTTLE_FACTOR);

    // Update global behavior settings in scene userData
    const updateGlobalBehaviorSettings = (updates: Partial<BehaviorThrottleConfig>) => {
        const scene = app?.editor?.scene;
        if (!scene?.userData) return;

        if (!scene.userData.behaviorsSettings) {
            scene.userData.behaviorsSettings = {};
        }

        scene.userData.behaviorsSettings = {
            ...scene.userData.behaviorsSettings,
            ...updates,
        };

        // Trigger scene save/change
        app.call("objectChanged", app.editor, scene);
        app?.call('sceneGraphChanged', app.editor);
    };

    // Load settings on mount
    useEffect(() => {
        // Defaults
        const defaultConfig: BehaviorThrottleConfig = {
            throttlePriority: BehaviorThrottlePriority.MEDIUM,
            enableFrustumCulling: true,
            enableDistanceThrottling: true,
            requiresConsistentUpdates: false,
        };

        const merged = { ...defaultConfig, ...globalSettings };

        setThrottlePriority(merged.throttlePriority);
        setEnableFrustumCulling(merged.enableFrustumCulling);
        setEnableDistanceThrottling(merged.enableDistanceThrottling);
        setRequiresConsistentUpdates(merged.requiresConsistentUpdates);
    }, [app]);

    const update = () => {
        const userThrottlingConfig = app.editor?.scene?.userData?.behaviorThrottlingConfig;
        if (userThrottlingConfig) {
            setFarDistance(
                userThrottlingConfig.farDistance !== undefined
                    ? userThrottlingConfig.farDistance
                    : DEFAULT_FAR_DISTANCE,
            );
            setVeryFarDistance(
                userThrottlingConfig.veryFarDistance !== undefined
                    ? userThrottlingConfig.veryFarDistance
                    : DEFAULT_VERY_FAR_DISTANCE,
            );
            setFarThrottleFactor(
                userThrottlingConfig.farThrottleFactor !== undefined
                    ? userThrottlingConfig.farThrottleFactor
                    : DEFAULT_FAR_THROTTLE_FACTOR,
            );
            setVeryFarThrottleFactor(
                userThrottlingConfig.veryFarThrottleFactor !== undefined
                    ? userThrottlingConfig.veryFarThrottleFactor
                    : DEFAULT_VERY_FAR_THROTTLE_FACTOR,
            );
            // Also update gameManager's config if game is active
            if (app.game?.config?.behaviorThrottling) {
                app.game.config.behaviorThrottling.farDistanceSq =
                    (userThrottlingConfig.farDistance ?? DEFAULT_FAR_DISTANCE) ** 2;
                app.game.config.behaviorThrottling.veryFarDistanceSq =
                    (userThrottlingConfig.veryFarDistance ?? DEFAULT_VERY_FAR_DISTANCE) ** 2;
                app.game.config.behaviorThrottling.farThrottleFactor =
                    userThrottlingConfig.farThrottleFactor ?? DEFAULT_FAR_THROTTLE_FACTOR;
                app.game.config.behaviorThrottling.veryFarThrottleFactor =
                    userThrottlingConfig.veryFarThrottleFactor ?? DEFAULT_VERY_FAR_THROTTLE_FACTOR;
            }
        } else if (app.game?.config?.behaviorThrottling) {
            // Fallback to gameManager's live config if no scene userData
            const config = app.game.config.behaviorThrottling;
            setFarDistance(
                config.farDistanceSq !== undefined ? Math.sqrt(config.farDistanceSq) : DEFAULT_FAR_DISTANCE,
            );
            setVeryFarDistance(
                config.veryFarDistanceSq !== undefined
                    ? Math.sqrt(config.veryFarDistanceSq)
                    : DEFAULT_VERY_FAR_DISTANCE,
            );
            setFarThrottleFactor(
                config.farThrottleFactor !== undefined ? config.farThrottleFactor : DEFAULT_FAR_THROTTLE_FACTOR,
            );
            setVeryFarThrottleFactor(
                config.veryFarThrottleFactor !== undefined
                    ? config.veryFarThrottleFactor
                    : DEFAULT_VERY_FAR_THROTTLE_FACTOR,
            );
        } else {
            setFarDistance(DEFAULT_FAR_DISTANCE);
            setVeryFarDistance(DEFAULT_VERY_FAR_DISTANCE);
            setFarThrottleFactor(DEFAULT_FAR_THROTTLE_FACTOR);
            setVeryFarThrottleFactor(DEFAULT_VERY_FAR_THROTTLE_FACTOR);
        }
    };


    useEffect(update, []);

    useEffect(() => {
        // Register all event listeners with namespaces for proper cleanup
        app.on("sceneSaved.GameSettings", update);
        app.on("sceneLoaded.GameSettings", update);
        app.on("clear.GameSettings", update);
        app.on("gameStarted.GameSettings", update);
        app.on("sceneGraphChanged.GameSettings", update);

        return () => {
            // Clean up all event listeners with namespaces
            try {
                app.on?.("sceneSaved.GameSettings", null);
                app.on?.("sceneLoaded.GameSettings", null);
                app.on?.("clear.GameSettings", null);
                app.on?.("gameStarted.GameSettings", null);
                app.on?.("sceneGraphChanged.GameSettings", null);
            } catch (error) {
                console.warn("GameSettings: Error cleaning up event listeners:", error);
            }
        };
    }, [app.editor, app.game, farDistance, veryFarDistance, farThrottleFactor, veryFarThrottleFactor]);


    const selectedPriority = priorityOptions.find(option => option.id === throttlePriority) || priorityOptions[2];

    const handleBehaviorCheckboxChange = (key: keyof BehaviorThrottleConfig, value: boolean, setter: React.Dispatch<React.SetStateAction<any>>) => {
        setter(value);
        updateGlobalBehaviorSettings({ [key]: value });
    };

    const handlePriorityChange = (item: any) => {
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
            setRequiresConsistentUpdates(throttleConfigUpdates.requiresConsistentUpdates);
            setEnableFrustumCulling(throttleConfigUpdates.enableFrustumCulling);
            setEnableDistanceThrottling(throttleConfigUpdates.enableDistanceThrottling);
        }

        updateGlobalBehaviorSettings(throttleConfigUpdates);
    };

    const behaviorPerformanceCheckboxes: CheckboxConfig[] = [
        {
            text: "Off Screen Optimization",
            state: enableFrustumCulling,
            setter: setEnableFrustumCulling,
            keyName: "enableFrustumCulling",
            tooltip: "Pauses updates when the object is outside the camera view to improve performance. Reduces processing when object is not visible.",
        },
        {
            text: "Distance-Based Optimization",
            state: enableDistanceThrottling,
            setter: setEnableDistanceThrottling,
            keyName: "enableDistanceThrottling",
            tooltip: "Reduces update frequency for objects far from the camera. Closer objects update more often than distant ones.",
        },
        {
            text: "Force Consistent Updates",
            state: requiresConsistentUpdates,
            setter: setRequiresConsistentUpdates,
            keyName: "requiresConsistentUpdates",
            tooltip: "Forces this behavior to update every frame, overriding all performance optimizations. Use for behaviors that need precise timing.",
        },
    ];

    const numericInputs: BehaviorThrottlingConfig[] = [
        {
            label: "Mid Distance Threshold",
            value: farDistance,
            setter: setFarDistance,
            keySq: "farDistanceSq",
            key: "farDistance",
            tooltip: "Objects farther than this distance (in meters) are throttled.",
        },
        {
            label: "Far Distance Threshold",
            value: veryFarDistance,
            setter: setVeryFarDistance,
            keySq: "veryFarDistanceSq",
            key: "veryFarDistance",
            tooltip: "Objects farther than this distance (in meters) are heavily throttled.",
        },
        {
            label: "Mid Throttle Factor",
            value: farThrottleFactor,
            setter: setFarThrottleFactor,
            key: "farThrottleFactor",
            tooltip: "Update interval multiplier for objects beyond mid distance.",
        },
        {
            label: "Far Throttle Factor",
            value: veryFarThrottleFactor,
            setter: setVeryFarThrottleFactor,
            key: "veryFarThrottleFactor",
            tooltip: "Update interval multiplier for objects beyond far distance.",
        },
    ];

    const updateBehaviorConfig = (setter: React.Dispatch<React.SetStateAction<any>>, key: string, value: number, keySq?: string) => {
        setter(value);

        if (app.game?.config?.behaviorThrottling) {
            if (keySq) {
                app.game.config.behaviorThrottling[keySq] = value * value;
            } else {
                app.game.config.behaviorThrottling[key] = value;

            }
        }

        if (app.editor?.scene?.userData) {
            app.editor.scene.userData.behaviorThrottlingConfig =
                app.editor.scene.userData.behaviorThrottlingConfig || {};
            app.editor.scene.userData.behaviorThrottlingConfig[key] = value;
        }

        app.call('objectChanged', app.editor, app.editor?.scene);
        app.call("sceneGraphChanged", app.editor);
    };

    return (
        <ContentItem>
            <PanelSectionTitle>Behavior Performance</PanelSectionTitle>
            <Separator margin="0 0 20px"
                invisible
            />
            <ContentItem $rowGap="16px">
                {behaviorPerformanceCheckboxes.map(({ text, state, setter, keyName, tooltip }) =>
                    <PanelCheckbox
                        key={text}
                        v2
                        text={text}
                        checked={!!state}
                        isGray
                        regular
                        onChange={() => handleBehaviorCheckboxChange(keyName, !state, setter)}
                        tooltipText={tooltip}
                        tooltipWidth="220px"
                    />,
                )}
                <SelectRow
                    label="Update Priority"
                    value={selectedPriority}
                    data={priorityOptions}
                    onChange={handlePriorityChange}
                    $margin="0"
                />
                {numericInputs.map(({ label, value, setter, key, tooltip }) => 
                    <NumericInputRow
                        key={label}
                        $margin="-8px 0 0"
                        label={label}
                        value={value}
                        setValue={val => updateBehaviorConfig(setter, key, val)}
                        tooltipText={tooltip}
                    />,
                )}
            </ContentItem>
        </ContentItem>
    );
}
