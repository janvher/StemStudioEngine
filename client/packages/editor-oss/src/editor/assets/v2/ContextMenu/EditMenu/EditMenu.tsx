import React, { useEffect, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";

import { AddBehaviorButton, ButtonWrapper, Nav, NavButton, NavWrapper, Wrapper } from "./EditMenu.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import BehaviorData from "../../../../../behaviors/BehaviorData";
import { AttachBehaviorCommand, DetachBehaviorCommand } from "@stem/editor-oss/command/Commands";
import global from "@stem/editor-oss/global";
import { AllBehaviorsList } from "../../RightPanel/tabs/ObjectBehaviors/AllBehaviorsList/AllBehaviorsList";
import { BehaviorInEditorConfigurationView } from "../../RightPanel/tabs/ObjectBehaviors/BehaviorInEditorConfigurationView";
import { SingleBehavior } from "../../RightPanel/tabs/ObjectBehaviors/SelectedBehaviorsList/SingleBehavior";
import { MenuItemConfig } from "../ContextMenu.types";

interface Props {
    position?: {
        x: number;
        y: number;
    };
    items: MenuItemConfig[];
    fixedPosition?: boolean;
}

export const EditMenu = ({ items, position, fixedPosition }: Props) => {
    const app = global.app as EngineRuntime;
    const editor = app.editor;
    const [isBehaviorsListDisplayed, setIsBehaviorsListDisplayed] = useState(false);
    const [data, setData] = useState<any>({});
    const [selectedBehavior, setSelectedBehavior] = useState<any>(null);

    const updateUI = () => {
        const selected = editor?.selected;
        if (!selected || Array.isArray(selected)) {
            return;
        }
        const sceneObj = editor?.objectByUuid(selected?.uuid);

        setData(sceneObj ? { [(sceneObj as any).id]: sceneObj } : {});
    };

    const handleObjectSelected = () => {
        updateUI();
        setSelectedBehavior(null);
    };

    useEffect(() => {
        if (!app) return;

        updateUI();
        app.on(`objectChanged.ObjectBehaviorsTypeSection`, updateUI);
        app.on(`objectRemoved.ObjectBehaviorsTypeSection`, updateUI);
        app.on(`objectSelected.ObjectBehaviorsTypeSection`, handleObjectSelected);
    }, []);

    const listRef = useRef<HTMLDivElement>(null);
    useOnClickOutside(listRef as React.RefObject<HTMLElement>, () => setIsBehaviorsListDisplayed(false));

    const behaviorConfigs = editor?.behaviorConfigRegistry.getAllConfigs() || [];

    const addNewBehavior = (id: string) => {
        const selected = editor?.selected;
        if (!selected || Array.isArray(selected)) {
            console.error("Cannot add behavior to object, no object selected");
            return;
        }

        const sceneObj = editor?.objectByUuid(selected.uuid);
        if (!sceneObj) {
            console.error("Cannot add behavior to object, no object found in scene");
            return;
        }

        void new AttachBehaviorCommand(sceneObj, id).execute();

        setIsBehaviorsListDisplayed(false);

        app.call(`objectChanged`, app.editor, sceneObj);
    };

    const handleRemoveBehaviorByUUID = (uuid: string) => {
        if (!app) return;
        const selected = editor?.selected;
        if (!selected || Array.isArray(selected)) return;

        if (selectedBehavior?.uuid === uuid) {
            setSelectedBehavior(null);
        }

        const sceneObj = editor?.objectByUuid(selected.uuid);
        if (!sceneObj) {
            console.error("Cannot remove behavior from object, no object found in scene");
            return;
        }

        new DetachBehaviorCommand(sceneObj, uuid).execute();

        app.call(`objectChanged`, app.editor, sceneObj);
    };

    const getAllBehaviors = (userData: any) => {
        return userData?.behaviors || [];
    };

    useEffect(() => {
        if (!isBehaviorsListDisplayed) return;

        let frameId: number;

        const setup = () => {
            const menu = listRef.current;
            if (!menu) {
                frameId = requestAnimationFrame(setup);
                return;
            }

            const handleMouseEnter = () => {
                app?.call("contextmenuHover");
            };

            const handleMouseLeave = () => {
                app?.call("contextmenuUnhover");
            };

            menu.addEventListener("mouseenter", handleMouseEnter);
            menu.addEventListener("mouseleave", handleMouseLeave);

            return () => {
                menu.removeEventListener("mouseenter", handleMouseEnter);
                menu.removeEventListener("mouseleave", handleMouseLeave);
                app?.call("contextmenuUnhover");
            };
        };

        const cleanup = setup();

        return () => {
            if (frameId) cancelAnimationFrame(frameId);
            if (typeof cleanup === "function") cleanup();
        };
    }, [isBehaviorsListDisplayed]);

    useEffect(() => {
        if (fixedPosition || !position) return;

        const menu = listRef.current;
        if (!menu || !isBehaviorsListDisplayed) return;

        const { offsetWidth: menuWidth } = menu;
        const { innerWidth } = window;
        const menuX = position.x;

        let newX = menuX;

        if (newX + menuWidth > innerWidth) {
            newX = innerWidth - menuWidth;
        }

        const canPlaceOnLeft = newX - menuWidth >= 0;

        const menuPositionClass = canPlaceOnLeft ? "left" : "right";

        menu.classList.add(menuPositionClass);
    }, [position, isBehaviorsListDisplayed]);

    return selectedBehavior ?
        <BehaviorInEditorConfigurationView playMode
            selectedBehavior={selectedBehavior}
            setSelectedBehavior={setSelectedBehavior}
        />
        :
        <Wrapper>
            <NavWrapper>
                <Nav>
                    {items.map(el =>
                        <NavButton key={el.label}
                            disabled={!!el.disabled}
                            onClick={el.onClick}
                            title={el.disabled ? `${el.label} is currently unavailable` : `Click to ${el.label.toLowerCase()}`}
                        >
                            <img src={el.icon}
                                alt="label"
                                className="icon"
                            />
                        </NavButton>,
                    )}
                </Nav>
            </NavWrapper>
            {Object.keys(data).map(id => {
                const allBehaviors = getAllBehaviors(data[id].userData);
                return (
                    <React.Fragment key={id}>
                        {allBehaviors.map((behaviorData: BehaviorData, index: any) =>
                            <SingleBehavior
                                playMode
                                key={behaviorData.uuid ?? index}
                                behaviorData={behaviorData}
                                allBehaviors={allBehaviors}
                                onRemoveBehaviorById={handleRemoveBehaviorByUUID}
                                setSelectedBehavior={setSelectedBehavior}
                            />,
                        )}
                    </React.Fragment>
                );
            })}
            <ButtonWrapper>
                <AddBehaviorButton
                    onClick={() => setIsBehaviorsListDisplayed(true)}
                    title="Click to add a behavior to this object"
                >
                    Add Behavior
                </AddBehaviorButton>
            </ButtonWrapper>
            {isBehaviorsListDisplayed &&
                <AllBehaviorsList
                    className="behaviorList hidden-scroll"
                    addNewBehavior={addNewBehavior}
                    ref={listRef}
                    behaviorConfigs={behaviorConfigs}
                />
            }
        </Wrapper>
        ;
};
