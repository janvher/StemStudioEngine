import React from "react";

import {PhysicsConfig} from "../../../types/physics";
import {PanelCheckbox} from "../../common/PanelCheckbox";
import {IPhysicsHandler} from "../PhysicsSection";

export enum CollisionType {
    Static = "Static",
    Dynamic = "Dynamic",
}

type PhysicsCheckboxesProps = {
    physicsEnabledState: boolean;
    setPhysicsEnabledState: (v: boolean) => void;
    handlePhysicsChange: (arg: IPhysicsHandler) => void;
    isLocked?: boolean;
    physics: PhysicsConfig;
};

export const PhysicsCheckboxes: React.FC<PhysicsCheckboxesProps> = ({
    physicsEnabledState,
    setPhysicsEnabledState,
    handlePhysicsChange,
    isLocked = false,
    physics,
}) => {
    const OPTIONS = [
        {
            key: "ctype",
            text: "Physics",
            checked: !!physicsEnabledState,
            onChange: (checked: boolean) => {
                handlePhysicsChange({value: checked ? CollisionType.Static : CollisionType.Dynamic, name: "ctype"});
                setPhysicsEnabledState(checked);
            },
        },
        {
            key: "climbable",
            text: "Can Climb/Traverse",
            checked: !!physics.climbable,
            onChange: (checked: boolean) => handlePhysicsChange({value: checked, name: "climbable"}),
            hidden: !physicsEnabledState,
        },
        {
            key: "shapeExcludesHiddenObjects",
            text: "Exclude Hidden Objects",
            checked: !!physics.shapeExcludesHiddenObjects,
            onChange: (checked: boolean) => handlePhysicsChange({value: checked, name: "shapeExcludesHiddenObjects"}),
            hidden: !physicsEnabledState,
        },
        {
            key: "enable_preview",
            text: "Shape Preview",
            checked: !!physics.enable_preview,
            onChange: (checked: boolean) => handlePhysicsChange({value: checked, name: "enable_preview"}),
            hidden: !physicsEnabledState,
        },
    ];

    return (
        <>
            {OPTIONS.map(el => {
                const {key, text, checked, onChange} = el;
                if (el.hidden) return;
                return (
                    <PanelCheckbox
                        key={key}
                        text={text}
                        v2
                        isGray
                        regular
                        checked={checked}
                        onChange={e => onChange(!!e.target.checked)}
                        disabled={isLocked}
                    />
                );
            })}
        </>
    );
};
