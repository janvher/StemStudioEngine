import React from "react";
import { Vector3Like } from "three";

import { AxisTransformSection } from "../../../common/MovementSection/AxisTransformSection";
import { CollisionType, PhysicsConfig, Shape } from "../../../types/physics";
import { SelectRow } from "../../common/SelectRow";
import { IPhysicsHandler } from "../PhysicsSection";

type PhysicsSelectProps = {
    physics: PhysicsConfig;
    shapes: {
        key: string;
        value: Shape;
    }[];
    collistionTypes: {
        key: string;
        value: CollisionType;
    }[];
    handlePhysicsChange: (arg: IPhysicsHandler) => void;
    isLocked?: boolean;
    shapeSettings?: boolean;
    userShapeScale?: Vector3Like;
    setUserShapeScale?: (v: any) => void;
    userShapeOffset?: Vector3Like;
    setUserShapeOffset?: (v: any) => void;
    section: "physicsType" | "shape";
};

export const PhysicsSelect: React.FC<PhysicsSelectProps> = ({
    physics,
    shapes,
    collistionTypes,
    handlePhysicsChange,
    isLocked = false,
    shapeSettings,
    userShapeScale,
    setUserShapeScale,
    userShapeOffset,
    setUserShapeOffset,
    section,
}) => {
    const axisSections = !shapeSettings ? [] : [
        {
            key: "shapeScale",
            name: "Shape Scale",
            value: userShapeScale!,
            setValue: setUserShapeScale!,
        },
        {
            key: "shapeOffset",
            name: "Shape Offset",
            value: userShapeOffset!,
            setValue: setUserShapeOffset!,
        },
    ];

    if (section === "physicsType") {
        return (
            <SelectRow
                label="Physics type"
                $margin="0"
                data={collistionTypes}
                value={collistionTypes.find(item => item.value === physics.ctype)}
                onChange={item => !isLocked ? handlePhysicsChange({ value: item.value, name: "ctype" }) : undefined}
            />
        );
    }

    return (
        <>
            {/* Shape dropdown */}
            <SelectRow
                label="Shape"
                $margin="0"
                data={shapes}
                value={shapes.find(item => item.key === physics.shape)}
                onChange={item => !isLocked ? handlePhysicsChange({ value: item.key, name: "shape" }) : undefined}
            />

            {/* Shape Scale and Shape Offset - grouped with Shape */}
            {shapeSettings &&
                axisSections.map(({ key, name, value, setValue }) =>
                    <AxisTransformSection
                        key={key}
                        isLocked={isLocked}
                        value={value}
                        setValue={(value) => !isLocked ? setValue(value) : undefined}
                        name={name}
                    />,
                )}
        </>
    );
};
