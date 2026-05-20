import { useEffect, useState } from "react";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import BehaviorData from "../../../../../behaviors/BehaviorData";
import global from "@stem/editor-oss/global";
import { BEHAVIOR_UI_CONTAINER_ID } from "@stem/editor-oss/types/editor";
import {isTemplateScene} from "@stem/editor-oss/utils/isTemplateScene";
import { ContentItem } from "../common/ContentItem";
import { Separator } from "../common/Separator";
import { InGameSettingsSection } from "../sections/InGameSettingsSection";
import { RenderingSection } from "../sections/RenderingSection";
import { TransformationSection } from "../sections/TransformationSection";
import { BehaviorGeneralPanel } from "../tabs/ObjectBehaviors/BehaviorGeneralPanel";
import { BehaviorThrottlingPanel } from "../tabs/ObjectBehaviors/BehaviorThrottlingPanel";

const DEFAULT_BEHAVIOR_ID = "billboard";

export const BillboardPanel = () => {
    const app = (global.app as EngineRuntime) || null;
    const [selectedBehavior, setSelectedBehavior] = useState<BehaviorData>();

    const behaviorUIManager = app?.editor?.behaviorUIManager;
    const behaviorConfigRegistry = app?.editor?.behaviorConfigRegistry;

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

        const BEHAVIOR_ID = selected.userData.billboardBehaviorID || DEFAULT_BEHAVIOR_ID;

        const config = behaviorConfigRegistry.getConfig(BEHAVIOR_ID);

        if (!config) {
            return console.error("Failed to read config with name: ", BEHAVIOR_ID);
        }

        const selectedObject = Array.isArray(selected) ? selected[0] : selected;

        if (
            !selectedObject ||
            !selectedObject.userData.behaviors ||
            !Array.isArray(selectedObject.userData.behaviors)
        ) {
            console.warn(`Selected billboard object doesn't have behaviors: ${BEHAVIOR_ID}`, selectedObject);
            return;
        }

        const behavior = selectedObject.userData.behaviors.find((b: {id: string}) => b.id === BEHAVIOR_ID);

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
        setSelectedBehavior(behavior);
    };

    useEffect(() => {
        handleOpenBehaviorUI();
        return () => {
            behaviorUIManager?.hideBehaviorUI();
        };
    }, []);

    useEffect(() => {
        if (app) {
            app.on(`objectSelected.BillboardPanel`, () => {
                behaviorUIManager?.hideBehaviorUI();
                handleOpenBehaviorUI();
            });
        }

        return () => {
            app?.on(`objectSelected.BillboardPanel`, null);
        };
    }, [app]);

    const isTemplate = isTemplateScene(app?.editor?.sceneID);

    return (
        <>
            <span className="common-text white-bold">Rendering</span>
            <Separator invisible />
            <ContentItem $rowGap="12px">
                <RenderingSection isLocked={isTemplate} />
            </ContentItem>
            <Separator />
            <span className="common-text white-bold">In-Game Settings</span>
            <Separator invisible />
            <ContentItem $rowGap="12px">
                <InGameSettingsSection isLocked={isTemplate} />
            </ContentItem>
            <Separator />
            <TransformationSection isLocked={isTemplate} />
            <Separator />
            <div className="common-text white-bold"
                style={{ marginBottom: "12px" }}
            >
                Content
            </div>
            <div id={BEHAVIOR_UI_CONTAINER_ID} />
            {/* General behavior settings */}
            {!app.isPlaying && selectedBehavior &&
                <>
                    <Separator />
                    <BehaviorGeneralPanel behaviorId={selectedBehavior.id}
                        behaviorUuid={selectedBehavior.uuid}
                    />
                    <Separator />
                    <BehaviorThrottlingPanel behaviorId={selectedBehavior.id}
                        behaviorUuid={selectedBehavior.uuid}
                    />
                </>
            }
        </>
    );
};
