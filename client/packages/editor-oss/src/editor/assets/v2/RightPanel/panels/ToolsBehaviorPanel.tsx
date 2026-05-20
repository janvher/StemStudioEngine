import { useEffect, useState } from "react";
import * as THREE from "three";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import global from "@stem/editor-oss/global";
import { BEHAVIOR_UI_CONTAINER_ID } from "@stem/editor-oss/types/editor";
import { TextInput } from "../../common/TextInput";
import { ContentItem } from "../common/ContentItem";
import { Separator } from "../common/Separator";
import { IBehaviorUISettings } from "../RightPanel";
import { InGameSettingsSection } from "../sections/InGameSettingsSection";
import { TransformationSection } from "../sections/TransformationSection";

interface Props {
    behaviorUISettings: IBehaviorUISettings;
}

export const ToolsBehaviorPanel = ({ behaviorUISettings }: Props) => {
    const { behaviorID, showTransformationSection, justPosition } = behaviorUISettings;
    const app = (global.app as EngineRuntime) || null;
    const editor = app?.editor;
    const selected = editor?.selected as THREE.Object3D<THREE.Object3DEventMap>;
    const behaviorUIManager = app?.editor?.behaviorUIManager;
    const behaviorConfigRegistry = app?.editor?.behaviorConfigRegistry;

    const [name, setName] = useState<string>(selected?.name ?? "");

    const handleNameChange = (value: string) => {
        if (app && editor?.selected) {
            const selected = editor?.selected as THREE.Object3D<THREE.Object3DEventMap>;
            setName(value);
            selected.name = value;
            selected.userData.uiTag = `UITag_${value}`;
            selected.userData.variable = value;

            app.call(`objectChanged`, editor.selected, editor.selected);
        }
    };

    const handleOpenBehaviorUI = async () => {
        if (!behaviorUIManager) {
            return console.error("Missing behaviorUIManager");
        }
        if (!behaviorConfigRegistry) {
            return console.error("Missing behaviorConfigRegistry");
        }
        const selected = app.editor?.selected;

        if (!selected || Array.isArray(selected)) {
            return;
        }
        const config = behaviorConfigRegistry.getConfig(behaviorID);

        if (!config) {
            return console.error("Failed to read config with name: ", behaviorID);
        }

        const selectedObject = Array.isArray(selected) ? selected[0] : selected;

        if (
            !selectedObject ||
            !selectedObject.userData.behaviors ||
            !Array.isArray(selectedObject.userData.behaviors)
        ) {
            console.warn(`Selected object doesn't have behaviors: ${behaviorID}`, selectedObject);
            return;
        }

        const behavior = selectedObject.userData.behaviors.find((b: {id: string}) => b.id === behaviorID);
        if (!behavior) return;

        const behaviorContextProvider = app.editor?.behaviorContextProvider;
        if (!behaviorContextProvider) {
            return console.error("Missing behaviorContextProvider");
        }

        const behaviorContext = await behaviorContextProvider.getBehaviorContext(
            selectedObject,
            (global.app!).editor!.scene,
            (global.app!).editor!.sceneID,
            (global.app!).editor!.assetSource ?? null,
        );

        behaviorUIManager.showBehaviorUI(config, behavior, behaviorContext);
    };

    useEffect(() => {
        behaviorUIManager?.hideBehaviorUI();
        handleOpenBehaviorUI();

        return () => {
            behaviorUIManager?.hideBehaviorUI();
        };
    }, [behaviorUISettings]);

    useEffect(() => {
        if (app) {
            app.on(`objectSelected.ToolsBehaviorPanel`, () => {
                setName((app?.editor?.selected as THREE.Object3D<THREE.Object3DEventMap>)?.name ?? "");
            });
            app.on(`objectChanged.ToolsBehaviorPanel`, () => {
                setName((app?.editor?.selected as THREE.Object3D<THREE.Object3DEventMap>)?.name ?? "");
            });
        }

        return () => {
            app?.on(`objectSelected.ToolsBehaviorPanel`, null);
            app?.on(`objectChanged.ToolsBehaviorPanel`, null);
        };
    }, [app]);

    return (
        <>
            <div className="Section">
                <div className="title">Name</div>
                <div className="box extended column">
                    <TextInput value={name}
                        setValue={handleNameChange}
                        className="dark-input name-input"
                    />
                </div>
            </div>
            {showTransformationSection &&
                <>
                    <Separator />
                    <TransformationSection justPosition={justPosition} />
                </>
            }
            <Separator invisible
                margin="16px 0"
            />
            <ContentItem $rowGap="12px"
                $alignItems="stretch"
            >
                <InGameSettingsSection />
                <div id={BEHAVIOR_UI_CONTAINER_ID} />
            </ContentItem>
            {/* General behavior settings */}
        </>
    );
};
