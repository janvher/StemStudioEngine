import React from "react";
import styled from "styled-components";
import {
    FunctionValueGenerator,
    ValueGenerator,
    ColorGenerator,
    ConstantColor,
    FunctionColorGenerator,
    AxisAngleGenerator,
    RandomQuatGenerator,
    RotationGenerator,
    EulerGenerator,
    ConstantValue,
    IntervalValue,
    PiecewiseBezier,
    ColorRange,
    RandomColor,
    Gradient,
    Vector3,
    RandomColorBetweenGradient,
} from "three.quarks";
// Import Vector3 and Vector4 from quarks for compatibility
import { Vector3 as QuarksVector3, Vector4 as QuarksVector4 } from "three.quarks";

import { Item } from "../../../common/BasicCombobox/BasicCombobox";
import { BezierCurvePreview } from "../BezierCurveEditor/BezierCurvePreview";
import { ColorSelectionRow } from "../ColorSelectionRow";
import { FieldType } from "../FieldEditor/FieldEditor";
import { GradientPicker } from "../GradientPicker";
import { NumericInputRow } from "../NumericInputRow";
import { SelectRow } from "../SelectRow";
import { StyledRowWrapper } from "../StyledRowWrapper";
import { Vector3Row } from "../Vector3Row";

const LabelsWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: flex-start;
    gap: 8px;
    height: 56px;
`;

const GeneratorWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
`;

const InlineEditor = styled.div`
    display: flex;
    flex-direction:column;
    align-items: flex-start;
    gap: 8px;
`;

const RowWrapper = styled.div`
    display: flex;
    column-gap: 4px;
    align-items: center;
    justify-content: flex-end;
`;

type EditorType =
    | "constant"
    | "intervalValue"
    | "piecewiseBezier"
    | "color"
    | "randomColor"
    | "colorRange"
    | "gradient"
    | "randomColorBetweenGradient"
    | "vec3"
    | "randomQuat"
    | "axisAngle"
    | "euler"
    | "number";

const ValueToEditor: { [a: string]: Array<EditorType> } = {
    value: ["constant", "intervalValue"],
    valueFunc: ["piecewiseBezier"],
    color: ["color", "randomColor"],
    colorFunc: ["colorRange", "gradient", "randomColorBetweenGradient"],
    rotationFunc: ["randomQuat", "axisAngle", "euler"],
    vec3: ["vec3"],
};

export type GenericGenerator =
    | ValueGenerator
    | FunctionValueGenerator
    | ColorGenerator
    | FunctionColorGenerator
    | RotationGenerator;

interface GeneratorEditorProps {
    allowedType: Array<FieldType>;
    name: string;
    selectLabel?: string;
    value: GenericGenerator;
    onChange: (generator: GenericGenerator) => void;
    margin?: string;
}

export const GeneratorEditor: React.FC<GeneratorEditorProps> = ({ allowedType, name, selectLabel, value, onChange, margin }) => {
    const getEditorType = (generator: GenericGenerator): EditorType => {
        if (generator instanceof ConstantValue) {
            return "constant";
        } else if (generator instanceof IntervalValue) {
            return "intervalValue";
        } else if (generator instanceof PiecewiseBezier) {
            return "piecewiseBezier";
        } else if (generator instanceof ConstantColor) {
            return "color";
        } else if (generator instanceof RandomColor) {
            return "randomColor";
        } else if (generator instanceof ColorRange) {
            return "colorRange";
        } else if (generator instanceof Gradient) {
            return "gradient";
        } else if (generator instanceof RandomColorBetweenGradient) {
            return "randomColorBetweenGradient";
        } else if (generator instanceof RandomQuatGenerator) {
            return "randomQuat";
        } else if (generator instanceof AxisAngleGenerator) {
            return "axisAngle";
        } else if (generator instanceof EulerGenerator) {
            return "euler";
        } else {
            return "number";
        }
    };

    const changeEditor = (selectedItem: Item) => {
        const editorType = selectedItem.value as EditorType;
        let generator: GenericGenerator | null = null;

        switch (editorType) {
            case "constant":
                generator = new ConstantValue(0);
                break;
            case "color":
                generator = new ConstantColor(new QuarksVector4(1, 1, 1, 1));
                break;
            case "intervalValue":
                generator = new IntervalValue(0, 1);
                break;
            case "colorRange":
                generator = new ColorRange(new QuarksVector4(0, 0, 0, 1), new QuarksVector4(1, 1, 1, 1));
                break;
            case "randomColor":
                generator = new RandomColor(new QuarksVector4(0, 0, 0, 1), new QuarksVector4(1, 1, 1, 1));
                break;
            case "gradient":
                generator = new Gradient(
                    [
                        [new Vector3(1, 0, 0), 0],
                        [new Vector3(1, 0, 0), 0],
                    ],
                    [
                        [1, 0],
                        [1, 1],
                    ],
                );
                break;
            case "randomColorBetweenGradient":
                generator = new RandomColorBetweenGradient(
                    new Gradient(
                        [
                            [new Vector3(1, 0, 0), 0],
                            [new Vector3(1, 0, 0), 0],
                        ],
                        [
                            [1, 0],
                            [1, 1],
                        ],
                    ),
                    new Gradient(
                        [
                            [new Vector3(1, 0, 0), 0],
                            [new Vector3(1, 0, 0), 0],
                        ],
                        [
                            [1, 0],
                            [1, 1],
                        ],
                    ),
                );
                break;
            case "piecewiseBezier":
                generator = new PiecewiseBezier();
                break;
            case "randomQuat":
                generator = new RandomQuatGenerator();
                break;
            case "axisAngle":
                generator = new AxisAngleGenerator(new QuarksVector3(0, 1, 0), new ConstantValue(Math.PI / 2));
                break;
            case "euler":
                generator = new EulerGenerator(new ConstantValue(0), new ConstantValue(0), new ConstantValue(0));
                break;
        }

        if (generator) {
            onChange(generator);
        }
    };

    // Helper functions for value changes
    const changeValue = (x: number) => {
        onChange(new ConstantValue(x));
    };

    const changeColor = (hexColor: string) => {
        // Convert hex to Vector4
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        onChange(new ConstantColor(new QuarksVector4(r, g, b, 1)));
    };

    const changeValueA = (x: number) => {
        const interval = value as IntervalValue;
        onChange(new IntervalValue(x, interval.b));
    };

    const changeValueB = (x: number) => {
        const interval = value as IntervalValue;
        onChange(new IntervalValue(interval.a, x));
    };

    const changeColorRangeA = (hexColor: string) => {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        const colorRange = value as ColorRange;
        onChange(new ColorRange(new QuarksVector4(r, g, b, 1), colorRange.b));
    };

    const changeColorRangeB = (hexColor: string) => {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        const colorRange = value as ColorRange;
        onChange(new ColorRange(colorRange.a, new QuarksVector4(r, g, b, 1)));
    };

    const changeRandomColorA = (hexColor: string) => {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        const randomColor = value as RandomColor;
        onChange(new RandomColor(new QuarksVector4(r, g, b, 1), randomColor.b));
    };

    const changeRandomColorB = (hexColor: string) => {
        const r = parseInt(hexColor.slice(1, 3), 16) / 255;
        const g = parseInt(hexColor.slice(3, 5), 16) / 255;
        const b = parseInt(hexColor.slice(5, 7), 16) / 255;
        const randomColor = value as RandomColor;
        onChange(new RandomColor(randomColor.a, new QuarksVector4(r, g, b, 1)));
    };

    const changeAxis = (axisValue: { x: number; y: number; z: number }) => {
        const axisAngle = value as AxisAngleGenerator;
        onChange(new AxisAngleGenerator(new QuarksVector3(axisValue.x, axisValue.y, axisValue.z), axisAngle.angle));
    };

    const changeAngle = (angleGenerator: GenericGenerator) => {
        const axisAngle = value as AxisAngleGenerator;
        onChange(new AxisAngleGenerator(axisAngle.axis, angleGenerator as ValueGenerator));
    };

    const changeEulerAngle = (pos: number) => (changedValue: GenericGenerator) => {
        const eulerValue = value as EulerGenerator;
        switch (pos) {
            case 0:
                onChange(new EulerGenerator(changedValue as ValueGenerator, eulerValue.angleY, eulerValue.angleZ));
                break;
            case 1:
                onChange(new EulerGenerator(eulerValue.angleX, changedValue as ValueGenerator, eulerValue.angleZ));
                break;
            case 2:
                onChange(new EulerGenerator(eulerValue.angleX, eulerValue.angleY, changedValue as ValueGenerator));
                break;
        }
    };

    const changeGradientA = (gradient: Gradient) => {
        const randomColorBetweenGradient = value as RandomColorBetweenGradient;
        onChange(new RandomColorBetweenGradient(gradient, randomColorBetweenGradient.gradient2));
    };

    const changeGradientB = (gradient: Gradient) => {
        const randomColorBetweenGradient = value as RandomColorBetweenGradient;
        onChange(new RandomColorBetweenGradient(randomColorBetweenGradient.gradient1, gradient));
    };

    // Helper function to convert Vector4 to hex color
    const vector4ToHex = (color: QuarksVector4): string => {
        const r = Math.round(color.x * 255)
            .toString(16)
            .padStart(2, "0");
        const g = Math.round(color.y * 255)
            .toString(16)
            .padStart(2, "0");
        const b = Math.round(color.z * 255)
            .toString(16)
            .padStart(2, "0");
        return `#${r}${g}${b}`;
    };

    // Build available editor types
    const editorTypes: Item[] = [];
    for (const valueType of allowedType) {
        const editorTypesForType = ValueToEditor[valueType as keyof typeof ValueToEditor];
        if (editorTypesForType) {
            for (const editorType of editorTypesForType) {
                editorTypes.push({
                    key: editorType,
                    value: editorType,
                });
            }
        }
    }

    const currentEditor = getEditorType(value);
    const currentEditorOption = editorTypes.find(option => option.value === currentEditor) || editorTypes[0];

    // Render the appropriate editor based on current type
    const renderEditor = () => {
        switch (currentEditor) {
            case "constant":
                return (
                    <NumericInputRow
                        label=""
                        value={(value as ConstantValue).value}
                        setValue={changeValue}
                        $margin="0"
                        width="60px"
                    />
                );

            case "color":
                return (
                    <ColorSelectionRow
                        label=""
                        value={vector4ToHex((value as ConstantColor).color)}
                        setValue={changeColor}
                        $margin="0"
                    />
                );

            case "intervalValue": {
                const interval = value as IntervalValue;
                return (
                    <InlineEditor>
                        <RowWrapper>
                            <NumericInputRow label=""
                                value={interval.a}
                                setValue={changeValueA}
                                $margin="0"
                                width="40px"
                            />
                            <span>-</span>
                            <NumericInputRow label=""
                                value={interval.b}
                                setValue={changeValueB}
                                $margin="0"
                                width="40px"
                            />
                        </RowWrapper>
                    </InlineEditor>
                );
            }

            case "colorRange": {
                const colorRange = value as ColorRange;
                return (
                    <InlineEditor>
                        <RowWrapper>
                            <ColorSelectionRow
                                label=""
                                value={vector4ToHex(colorRange.a)}
                                setValue={changeColorRangeA}
                                $margin="0"
                            />
                            <span>-</span>
                            <ColorSelectionRow
                                label=""
                                value={vector4ToHex(colorRange.b)}
                                setValue={changeColorRangeB}
                                $margin="0"
                            />
                        </RowWrapper>
                    </InlineEditor>
                );
            }

            case "randomColor": {
                const randomColor = value as RandomColor;
                return (
                    <InlineEditor>
                        <RowWrapper>
                            <ColorSelectionRow
                                label=""
                                value={vector4ToHex(randomColor.a)}
                                setValue={changeRandomColorA}
                                $margin="0"
                            />
                            <span>-</span>
                            <ColorSelectionRow
                                label=""
                                value={vector4ToHex(randomColor.b)}
                                setValue={changeRandomColorB}
                                $margin="0"
                            />
                        </RowWrapper>
                    </InlineEditor>
                );
            }

            case "piecewiseBezier":
                return (
                    <StyledRowWrapper $margin="0">
                        <BezierCurvePreview
                            value={value as PiecewiseBezier}
                            width={80}
                            height={40}
                            onChange={curve => onChange(new PiecewiseBezier(curve.functions))}
                        />
                    </StyledRowWrapper>
                );

            case "gradient":
                return (
                    <StyledRowWrapper $margin="0">
                        <GradientPicker value={value as Gradient}
                            setValue={onChange}
                            width={60}
                        />
                    </StyledRowWrapper>
                );
            case "randomColorBetweenGradient":
                return (
                    <InlineEditor>
                        <RowWrapper>
                            <GradientPicker
                                value={(value as RandomColorBetweenGradient).gradient1}
                                setValue={changeGradientA}
                                width={40}
                            />
                            -
                            <GradientPicker
                                value={(value as RandomColorBetweenGradient).gradient2}
                                setValue={changeGradientB}
                                width={40}
                            />
                        </RowWrapper>
                    </InlineEditor>
                );

            case "randomQuat":
                return (
                    <StyledRowWrapper $margin="0">
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            Random quaternion - no parameters
                        </span>
                    </StyledRowWrapper>
                );
            case "number":
                return (
                    <NumericInputRow
                        label=""
                        value={value as unknown as number}
                        setValue={changeValue}
                        $margin="0"
                        width="60px"
                    />
                );

            default:
                return null;
        }
    };

    const renderPostEditor = () => {
        switch (currentEditor) {
            case "axisAngle": {
                const axisAngle = value as AxisAngleGenerator;
                const axis = axisAngle.axis;
                return (
                    <>
                        <Vector3Row
                            label="Axis"
                            value={{ x: axis.x, y: axis.y, z: axis.z }}
                            setValue={changeAxis}
                            margin="8px 0 0 0"
                        />
                        <GeneratorEditor
                            allowedType={["value", "valueFunc"]}
                            name="Angle"
                            value={axisAngle.angle}
                            onChange={changeAngle}
                            margin="8px 0 0 0"
                        />
                    </>
                );
            }

            case "euler": {
                const euler = value as EulerGenerator;
                return (
                    <>
                        <GeneratorEditor
                            allowedType={["value", "valueFunc"]}
                            name="Angle X"
                            value={euler.angleX}
                            onChange={changeEulerAngle(0)}
                            margin="8px 0 0 0"
                        />
                        <GeneratorEditor
                            allowedType={["value", "valueFunc"]}
                            name="Angle Y"
                            value={euler.angleY}
                            onChange={changeEulerAngle(1)}
                            margin="8px 0 0 0"
                        />
                        <GeneratorEditor
                            allowedType={["value", "valueFunc"]}
                            name="Angle Z"
                            value={euler.angleZ}
                            onChange={changeEulerAngle(2)}
                            margin="8px 0 0 0"
                        />
                    </>
                );
            }

            default:
                return null;
        }
    };

    const postEditor = renderPostEditor();

    return (
        <StyledRowWrapper $margin={margin}>
            <GeneratorWrapper>
                <StyledRowWrapper $margin="0"
                    style={{ alignItems: "flex-start" }}
                >
                    <LabelsWrapper>
                        <span className="text">{name}</span>
                        <span className="text">{selectLabel}</span>
                    </LabelsWrapper>
                    <InlineEditor>
                        {renderEditor()}
                        <SelectRow
                            label={""}
                            data={editorTypes}
                            value={currentEditorOption}
                            onChange={changeEditor}
                            $margin="0"
                            width="80px"
                        />
                    </InlineEditor>
                </StyledRowWrapper>
                {postEditor}
            </GeneratorWrapper>
        </StyledRowWrapper>
    );
};
