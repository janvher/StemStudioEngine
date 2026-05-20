import { type MouseEvent as ReactMouseEvent, useEffect, useState } from "react";
import styled from "styled-components";
import { toast } from "toastywave";

import { BehaviorInEditorConfigurationView } from "./BehaviorInEditorConfigurationView";
import { MainView } from "./MainView";
import BehaviorData from "../../../../../../behaviors/BehaviorData";
import { AttachBehaviorCommand } from "@stem/editor-oss/command/Commands";
import global from "@stem/editor-oss/global";
import i18n from "@stem/editor-oss/i18n/config";
import { ItemMenuText, RightClickMenu } from "../../../../../../ui/common/RightClickMenu/RightClickMenu";

export const ObjectBehaviorsTab = () => {
    const app = global.app!;
    const editor = app.editor!;
    const [selectedBehavior, setSelectedBehavior] = useState<any>(null);
    const [behaviorsMenuOpen, setBehaviorsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [isBehaviorsListDisplayed, setIsBehaviorsListDisplayed] = useState(false);

    const handleRightClick = (event: ReactMouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        let target = event.target as HTMLElement;

        while (target) {
            if (target.id === "behavior") {
                return;
            }
            target = target.parentElement as HTMLElement;
        }

        setBehaviorsMenuOpen(prev => !prev);
        const x = event.clientX;
        const y = event.clientY;

        setMenuPosition({ x, y });
    };

    const addNewBehavior = async (id: string) => {
        const selected = editor.selected;
        if (!selected || Array.isArray(selected)) {
            console.error("Cannot add behavior to object, no object selected");
            return;
        }

        const behavior = await editor.addBehaviorToObject(selected, id);
        if (behavior) {
            void app.game?.addBehaviorToObject(selected, id);
            setIsBehaviorsListDisplayed(false);
        }

        app.call(`objectChanged`, app.editor, editor.selected);
    };

    const pasteReadyBehavior = (behaviorData: BehaviorData) => {
        const selected = editor.selected;
        if (!selected || Array.isArray(selected)) {
            console.error("Cannot add behavior to object, no object selected");
            return;
        }

        // unique uuid will be generated when adding
        void new AttachBehaviorCommand(selected, behaviorData.id, {
            attributesData: behaviorData.attributesData,
            throttleConfig: behaviorData.throttleConfig,
            enabled: behaviorData.enabled,
        }).execute();

        app.call(`objectChanged`, app.editor, editor.selected);
    };

    const closeMenu = () => {
        setMenuPosition(null);
        setBehaviorsMenuOpen(false);
    };

    const copyAllBehaviors = () => {
        if (!app) return;
        const selected = editor.selected;
        if (!selected || Array.isArray(selected)) return;

        const obj = editor.objectByUuid(selected.uuid);

        const behaviorString = JSON.stringify(obj!.userData.behaviors);
        navigator.clipboard
            .writeText(behaviorString)
            .then(() => toast.success(i18n.t("Behaviors copied!")))
            .catch(err => console.error("Failed to copy: ", err));
        closeMenu();
    };

    const pasteBehavior = async (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const text = await navigator.clipboard.readText();
            if (!text) {
                return toast.warning(i18n.t("No object to paste."));
            }
            let pastedBehavior;
            try {
                pastedBehavior = JSON.parse(text);
            } catch {
                return toast.warning(i18n.t("Invalid data format in clipboard."));
            }
            if (Array.isArray(pastedBehavior)) {
                pastedBehavior.forEach(el => {
                    pasteReadyBehavior(el);
                });
            } else if (typeof pastedBehavior === "object") {
                pasteReadyBehavior(pastedBehavior);
            } else {
                return toast.warning(i18n.t("No object to paste."));
            }
            closeMenu();
        } catch (err) {
            console.error("Failed to paste: ", err);
            closeMenu();
            return toast.warning(i18n.t("No object to paste."));
        }
    };

    useEffect(() => {
        app.on("behaviorAutoUpdate.ObjectBehaviorsTab", () => {
            if (selectedBehavior) {
                const selected = editor.selected;
                if (!selected || Array.isArray(selected)) return;
                const behaviors = selected.userData?.behaviors;
                if (!behaviors) return;
                const updatedBehavior = behaviors.find((b: BehaviorData) => b.uuid === selectedBehavior.uuid);
                setSelectedBehavior(updatedBehavior || null);
            }
        });

        return () => {
            app.on("behaviorAutoUpdate.ObjectBehaviorsTab", null);
        };
    }, [selectedBehavior]);

    useEffect(() => {
        app.on("objectSelected.ObjectBehaviorsTab", () => {
            setSelectedBehavior(null);
        });

        return () => {
            app.on("objectSelected.ObjectBehaviorsTab", null);
        };
    }, [setSelectedBehavior]);

    const behaviorConfigs = editor.behaviorConfigRegistry.getAllConfigs();

    return (
        <Wrapper
            onContextMenu={handleRightClick}
            title={i18n.t("Right-click to open behavior copy and paste actions")}
        >
            {!selectedBehavior ?
                <>
                    <MainView
                        isBehaviorsListDisplayed={isBehaviorsListDisplayed}
                        setIsBehaviorsListDisplayed={setIsBehaviorsListDisplayed}
                        addNewBehavior={addNewBehavior}
                        setSelectedBehavior={setSelectedBehavior}
                        selectedBehavior={selectedBehavior}
                        copyAllBehaviors={copyAllBehaviors}
                        pasteBehavior={pasteBehavior}
                        behaviorConfigs={behaviorConfigs}
                    />
                    {behaviorsMenuOpen && menuPosition &&
                        <RightClickMenu onClickoutsideCallback={closeMenu}
                            left={menuPosition.x}
                            top={menuPosition.y}
                        >
                            <ItemMenuText
                                onClick={copyAllBehaviors}
                                title={i18n.t("Copy all behaviors from the selected object")}
                            >
                                {i18n.t("Copy All behaviors")}
                            </ItemMenuText>
                            <ItemMenuText
                                onClick={pasteBehavior}
                                title={i18n.t("Paste behavior data from clipboard")}
                            >
                                {i18n.t("Paste Behavior")}
                            </ItemMenuText>
                        </RightClickMenu>
                    }
                </>
                :
                <BehaviorInEditorConfigurationView selectedBehavior={selectedBehavior}
                    setSelectedBehavior={setSelectedBehavior}
                />
            }
        </Wrapper>
    );
};

export const Wrapper = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    overflow: hidden;
    position: relative;
`;
