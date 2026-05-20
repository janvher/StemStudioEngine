import React from "react";
import {Object3D, Vector2Like} from "three";
import {
    ColorGenerator,
    FunctionColorGenerator,
    FunctionValueGenerator,
    FieldType as QuarksFieldType,
    RotationGenerator,
    ValueGenerator,
    Gradient,
} from "three.quarks";

import {ColorSelectionRow} from "../ColorSelectionRow";
import {GeneratorEditor} from "../GeneratorEditor/GeneratorEditor";
import {GradientPicker} from "../GradientPicker";
import {NumericInputRow} from "../NumericInputRow";
import {Object3DSelect} from "../Object3DSelect";
import {RoundedCheckbox} from "../RoundedCheckbox";
import {StyledRowWrapper} from "../StyledRowWrapper";
import {TextInputRow} from "../TextInputRow";
import {Vector2Row} from "../Vector2Row";
import {Vector3Row} from "../Vector3Row";
import {FunctionFieldEditor} from "./FunctionFieldEditor";
import {SelectRow} from "../SelectRow";

export type GenericGenerator =
    | ValueGenerator
    | FunctionValueGenerator
    | ColorGenerator
    | FunctionColorGenerator
    | RotationGenerator;

export type FieldType =
    | QuarksFieldType
    | "rotation"
    | "vec2"
    | "string"
    | "boolean"
    | "texture"
    | "rotationByAxis"
    | "color"
    | "function"
    | "gradient"
    | FieldType[];

export interface FieldEditorProps {
    label: string;
    fieldType: FieldType;
    value: unknown;
    onChange: (newValue: unknown) => void;
    disabled?: boolean;
    margin?: string;
    fieldName: string; // Optional field name for Object3DSelect
    target: {[k: string]: any};
}

export const FieldEditor: React.FC<FieldEditorProps> = ({
    target,
    fieldName,
    label,
    fieldType,
    value,
    onChange,
    disabled = false,
    margin,
}) => {
    const onChangeBehaviorFunc = (generator: GenericGenerator) => {
        target[fieldName] = generator;
        onChange(target[fieldName]);
    };

    const onChangeString = (x: string) => {
        target[fieldName] = x;
        onChange(target[fieldName]);
    };

    const onChangeNumber = (x: number) => {
        target[fieldName] = x;
        onChange(target[fieldName]);
    };

    const onChangeBoolean = (x: boolean) => {
        target[fieldName] = x;
        onChange(target[fieldName]);
    };

    const onChangeObject3D = (x: Object3D) => {
        target[fieldName] = x;
        onChange(target[fieldName]);
    };

    const onChangeVec2 = (value: Vector2Like) => {
        target[fieldName].x = value.x;
        target[fieldName].y = value.y;
        onChange(target[fieldName]);
    };

    const onChangeVec3 = (value: {x: number; y: number; z: number}) => {
        target[fieldName].x = value.x;
        target[fieldName].y = value.y;
        target[fieldName].z = value.z;
        onChange(target[fieldName]);
    };

    const onChangeColor = (value: {r: number; g: number; b: number; a?: number}) => {
        target[fieldName].r = value.r;
        target[fieldName].g = value.g;
        target[fieldName].b = value.b;
        if (value.a !== undefined) {
            target[fieldName].a = value.a;
        }
        onChange(target[fieldName]);
    };

    const onChangeGradient = (gradient: Gradient) => {
        console.log("onChangeGradient");
        target[fieldName] = gradient;
        onChange(target[fieldName]);
    };

    const emitterModeOptions = [
        {key: "0", value: "Random"},
        {key: "1", value: "Loop"},
        {key: "2", value: "PingPong"},
        {key: "3", value: "Burst"},
    ];

    const renderField = () => {
        if (Array.isArray(fieldType) && fieldType.length > 1) {
            const name = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

            return (
                <GeneratorEditor
                    key={fieldName}
                    name={name}
                    selectLabel={name + " Type"}
                    allowedType={fieldType}
                    value={target[fieldName]}
                    onChange={onChangeBehaviorFunc}
                />
            );
        }
        fieldType = (Array.isArray(fieldType) ? fieldType[0] : fieldType) as FieldType;
        switch (fieldType) {
            case "number":
            case "radian":
                return (
                    <NumericInputRow
                        label={label}
                        value={typeof value === "number" ? value : 0}
                        setValue={onChangeNumber}
                        disabled={disabled}
                        $margin={margin}
                        unit={fieldType === "radian" ? "rad" : undefined}
                    />
                );

            case "boolean":
                return (
                    <StyledRowWrapper $margin={margin}>
                        <span className="text">{label}</span>
                        <RoundedCheckbox
                            checked={Boolean(value)}
                            onChange={() => onChangeBoolean(!value)}
                            label=""
                            customId={`field-${label.replace(/\s+/g, "-").toLowerCase()}`}
                        />
                    </StyledRowWrapper>
                );
            case "emitterMode":
                return (
                    <StyledRowWrapper $margin={margin}>
                        <SelectRow
                            label={label}
                            data={emitterModeOptions}
                            value={emitterModeOptions.find(opt => opt.key === String(value)) || emitterModeOptions[0]}
                            onChange={item => onChangeNumber(Number(item.key))}
                            $margin={margin}
                            width="107px !important"
                        />
                    </StyledRowWrapper>
                );
            case "string":
                return (
                    <TextInputRow
                        label={label}
                        value={typeof value === "string" ? value : ""}
                        setValue={onChangeString}
                        margin={margin}
                    />
                );

            case "vec2":
                return (
                    <Vector2Row
                        label={label}
                        value={
                            value && typeof value === "object" && "x" in value && "y" in value
                                ? (value as {x: number; y: number})
                                : {x: 0, y: 0}
                        }
                        setValue={onChangeVec2}
                        disabled={disabled}
                        margin={margin}
                    />
                );

            case "vec3":
            case "rotation":
                return (
                    <Vector3Row
                        label={label}
                        value={
                            value && typeof value === "object" && "x" in value && "y" in value && "z" in value
                                ? (value as {x: number; y: number; z: number})
                                : {x: 0, y: 0, z: 0}
                        }
                        setValue={onChangeVec3}
                        disabled={disabled}
                        margin={margin}
                    />
                );

            case "color": {
                // For color, convert to hex string format that ColorSelectionRow expects
                const colorObj =
                    value && typeof value === "object" && "r" in value
                        ? (value as {r: number; g: number; b: number; a?: number})
                        : {r: 1, g: 1, b: 1, a: 1};

                const colorValue = `#${Math.round(colorObj.r * 255)
                    .toString(16)
                    .padStart(2, "0")}${Math.round(colorObj.g * 255)
                    .toString(16)
                    .padStart(2, "0")}${Math.round(colorObj.b * 255)
                    .toString(16)
                    .padStart(2, "0")}`;

                return (
                    <ColorSelectionRow
                        label={label}
                        value={colorValue}
                        setValue={hexColor => {
                            // Convert hex back to RGB object
                            const r = parseInt(hexColor.slice(1, 3), 16) / 255;
                            const g = parseInt(hexColor.slice(3, 5), 16) / 255;
                            const b = parseInt(hexColor.slice(5, 7), 16) / 255;
                            onChangeColor({r, g, b, a: 1});
                        }}
                        $margin={margin}
                    />
                );
            }

            case "function":
                return (
                    <FunctionFieldEditor
                        label={label}
                        fieldType={fieldType}
                        value={value}
                        onChange={onChange}
                        disabled={disabled}
                        margin={margin}
                    />
                );

            case "texture":
                return (
                    <TextInputRow
                        label={label}
                        value={typeof value === "string" ? value : ""}
                        setValue={onChangeString}
                        margin={margin}
                    />
                );

            case "rotationByAxis":
                // For rotation by axis, we might want a different UI
                return (
                    <Vector3Row
                        label={label}
                        value={
                            value && typeof value === "object" && "x" in value && "y" in value && "z" in value
                                ? (value as {x: number; y: number; z: number})
                                : {x: 0, y: 0, z: 0}
                        }
                        setValue={onChangeVec3}
                        disabled={disabled}
                        margin={margin}
                    />
                );
            case "mesh":
                return (
                    <Object3DSelect
                        key={label}
                        name={label}
                        listableTypes={["Mesh", "ParticleEmitter"]}
                        onChange={onChangeObject3D}
                        value={target[fieldName] as Object3D}
                    />
                );
            case "particleSystem":
                return (
                    <Object3DSelect
                        key={label}
                        name={label}
                        listableTypes={["ParticleEmitter"]}
                        onChange={onChangeObject3D}
                        value={target[fieldName] as Object3D}
                    />
                );

            case "valueFunc":
                return (
                    <GeneratorEditor
                        key={fieldName}
                        name={fieldName}
                        allowedType={[fieldType, "value"]}
                        value={target[fieldName]}
                        onChange={onChangeBehaviorFunc}
                    />
                );
            case "colorFunc":
            case "rotationFunc":
            case "value":
                return (
                    <GeneratorEditor
                        key={fieldName}
                        name={fieldName}
                        allowedType={[fieldType]}
                        value={target[fieldName]}
                        onChange={onChangeBehaviorFunc}
                    />
                );
            case "gradient":
                return (
                    <StyledRowWrapper $margin={margin}>
                        <span className="text">{label}</span>
                        <GradientPicker
                            value={target[fieldName] as Gradient}
                            setValue={onChangeGradient}
                            disabled={disabled}
                        />
                    </StyledRowWrapper>
                );
            default:
                return (
                    <GeneratorEditor
                        key={fieldName}
                        name={fieldName}
                        allowedType={[fieldType]}
                        value={target[fieldName]}
                        onChange={onChangeBehaviorFunc}
                    />
                );
        }
    };

    return renderField();
};
