import {useEffect, useRef, useState} from "react";

import {useAngleUnits} from "@stem/editor-oss/hooks/useAngleUnits";
import {useUnits} from "@stem/editor-oss/hooks/useUnits";
import {ITransformValue, TRANSFORMATION_OPTIONS} from "@stem/editor-oss/types/editor";
import {ANGLE_UNIT_SYMBOLS} from "../../RightPanel/panels/ProjectSettings/AngleUnitsSection";
import {UnitType, UNITS, UNIT_LABELS} from "../../RightPanel/panels/ProjectSettings/UnitsSection";
import {InputSymbol} from "../InputSymbol";
import {LockIcon} from "../LockIcon";
import {NumericInput} from "../NumericInput";
import {Box, BoxInputs, BoxLabels, InputWrapper, LockWrapper, Wrapper} from "./MovementSection.style";

const INPUT_ARRAY = [
    {
        name: "Position",
        type: TRANSFORMATION_OPTIONS.POSITION,
    },
    {
        name: "Size",
        type: TRANSFORMATION_OPTIONS.SIZE,
    },
    {
        name: "Scale",
        type: TRANSFORMATION_OPTIONS.SCALE,
    },
    {
        name: "Rotation",
        type: TRANSFORMATION_OPTIONS.ROTATION,
    },
];

export type AxisType = "x" | "y" | "z";

export const AxisArray: AxisType[] = ["x", "y", "z"];

interface Props {
    isLocked?: boolean;
    positionValue?: ITransformValue;
    rotationValue?: ITransformValue;
    sizeValue?: ITransformValue;
    scaleValue?: ITransformValue;
    getSetValueFunc: (type: TRANSFORMATION_OPTIONS, value: number, toUpdate: "x" | "y" | "z") => void;
    children?: any;
    setScaleLocked?: React.Dispatch<React.SetStateAction<boolean>>;
    scaleLocked?: boolean;
    noRotation?: boolean;
    noPosition?: boolean;
    noScale?: boolean;
    noSize?: boolean;
    setSizeValue: React.Dispatch<React.SetStateAction<ITransformValue>>;
    setScaleValue: React.Dispatch<React.SetStateAction<ITransformValue>>;
    setRotationValue: React.Dispatch<React.SetStateAction<ITransformValue>>;
}

export const MovementSection = ({
    isLocked,
    positionValue,
    rotationValue,
    scaleValue,
    getSetValueFunc,
    children,
    scaleLocked,
    setScaleLocked,
    noPosition,
    noSize,
    noRotation,
    noScale,
    sizeValue,
    setSizeValue,
    setScaleValue,
    setRotationValue,
}: Props) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<null | {
        type: TRANSFORMATION_OPTIONS;
        axis: AxisType;
        value: number;
    }>(null);
    const [isInResizableWrapper, setIsInResizableWrapper] = useState(false);
    const {isEnabled, unitsSettings} = useUnits();
    const {currentUnit: currentAngleUnit} = useAngleUnits();

    // Local state for per-object unit override (resets when switching objects)
    const [localUnit, setLocalUnit] = useState<UnitType | null>(null);

    // Reset local unit when global unit changes (e.g., switching to another object or changing in settings)
    useEffect(() => {
        setLocalUnit(null);
    }, [unitsSettings?.currentUnit]);

    useEffect(() => {
        if (wrapperRef.current) {
            const found = wrapperRef.current.closest(".resizable_wrapper");
            setIsInResizableWrapper(!!found);
        }
    }, []);

    // Get the active unit (local override or global default)
    const activeUnit: UnitType = localUnit ?? unitsSettings?.currentUnit ?? "meters";

    // Local conversion functions using active unit
    const convertFromMetersLocal = (valueInMeters: number): number => {
        if (!isEnabled) return valueInMeters;
        const conversionFactor = UNITS[activeUnit];
        return valueInMeters / conversionFactor;
    };

    const convertToMetersLocal = (valueInCurrentUnit: number): number => {
        if (!isEnabled) return valueInCurrentUnit;
        const conversionFactor = UNITS[activeUnit];
        return valueInCurrentUnit * conversionFactor;
    };

    const getUnitLabelLocal = (): string => {
        if (!isEnabled) return "";
        return UNIT_LABELS[activeUnit];
    };

    // Local cycling function - only updates local state
    const cycleUnitLocal = (): void => {
        const unitKeys: UnitType[] = ["meters", "centimeters", "millimeters", "inches", "feet"];
        const currentIndex = unitKeys.indexOf(activeUnit);
        const nextIndex = (currentIndex + 1) % unitKeys.length;
        const nextUnit = unitKeys[nextIndex]!;

        setLocalUnit(nextUnit);
    };

    const handleDrag = (type: TRANSFORMATION_OPTIONS, value: number, axis: AxisType) => {
        dragRef.current = {type, value, axis};

        if (type === TRANSFORMATION_OPTIONS.SIZE) {
            setSizeValue(prev => ({...prev, [axis]: value}));
        }

        if (type === TRANSFORMATION_OPTIONS.SCALE) {
            setScaleValue(prev => ({...prev, [axis]: value}));
        }

        if (type === TRANSFORMATION_OPTIONS.ROTATION) {
            setRotationValue(prev => ({...prev, [axis]: value}));
        }

        // Apply the change live so the viewport (OBB, gizmos, scale field)
        // reflects the drag in realtime, not only on mouse-up.
        getSetValueFunc(type, value, axis);
    };

    const commitDrag = () => {
        dragRef.current = null;
    };

    return (
        <Wrapper ref={wrapperRef}>
            {INPUT_ARRAY.map(({name, type}) => {
                const isScale = type === TRANSFORMATION_OPTIONS.SCALE;
                const isPosition = type === TRANSFORMATION_OPTIONS.POSITION;
                const isRotation = type === TRANSFORMATION_OPTIONS.ROTATION;
                const isSize = type === TRANSFORMATION_OPTIONS.SIZE;

                if (noRotation && isRotation) return;
                if (noPosition && isPosition) return;
                if (noSize && isSize) return;
                if (noScale && isScale) return;

                const shouldBeLocked = !!isLocked && !isScale;

                const currentValue = isSize
                    ? sizeValue
                    : isScale
                      ? scaleValue
                      : isPosition
                        ? positionValue
                        : rotationValue;

                if (!currentValue) {
                    return console.error("Movement section didn't receive correct value for: ", name);
                }

                // Determine if this field should show units
                const shouldShowUnits = isEnabled && (isPosition || isSize);
                const unitLabel = shouldShowUnits ? getUnitLabelLocal() : "";
                const angleUnitLabel = isRotation ? ANGLE_UNIT_SYMBOLS[currentAngleUnit] : "";
                const displayName = unitLabel
                    ? `${name}(${unitLabel})`
                    : angleUnitLabel
                      ? `${name}(${angleUnitLabel})`
                      : name;

                const handleLabelClick = () => {
                    if (shouldShowUnits) {
                        cycleUnitLocal();
                    }
                };

                return (
                    <Box key={name}>
                        <BoxLabels>
                            <div
                                className="title titleSecondary"
                                onClick={handleLabelClick}
                                style={{
                                    cursor: shouldShowUnits ? "pointer" : "default",
                                    userSelect: "none",
                                }}
                            >
                                {displayName}
                            </div>
                        </BoxLabels>
                        <BoxInputs>
                            {AxisArray.map((axis: AxisType) => {
                                const id = isScale
                                    ? "scaleInput"
                                    : isRotation
                                      ? "rotateInput"
                                      : isSize
                                        ? "sizeInput"
                                        : "translateInput";

                                // Get the value in meters (internal representation)
                                const valueInMeters = currentValue[axis];

                                // Convert for display if units are enabled and this is a position/size field
                                const displayValue = shouldShowUnits
                                    ? convertFromMetersLocal(valueInMeters)
                                    : valueInMeters;

                                // Create a wrapper function to convert back to meters when setting
                                const handleSetValue = (value: number) => {
                                    const valueToSet = shouldShowUnits ? convertToMetersLocal(value) : value;
                                    getSetValueFunc(type, valueToSet, axis);
                                };

                                return (
                                    <InputWrapper
                                        key={axis}
                                        $isInResizableWrapper={isInResizableWrapper}
                                    >
                                        {isScale && setScaleLocked && axis === "x" && (
                                            <LockWrapper>
                                                <LockIcon
                                                    locked={!!scaleLocked}
                                                    onClick={() => setScaleLocked(!scaleLocked)}
                                                />
                                            </LockWrapper>
                                        )}
                                        <InputSymbol
                                            symbol={axis.toUpperCase()}
                                            value={displayValue}
                                            setValue={v => handleDrag(type, v, axis)}
                                            onMouseUp={commitDrag}
                                            isLocked={shouldBeLocked}
                                        />
                                        <NumericInput
                                            id={id + axis}
                                            value={displayValue}
                                            setValue={() => {
                                                return null;
                                            }}
                                            unit={isRotation ? ANGLE_UNIT_SYMBOLS[currentAngleUnit] : undefined}
                                            className="dark-input"
                                            disabled={shouldBeLocked}
                                            onBlur={handleSetValue}
                                            onDragValueChange={handleSetValue}
                                        />
                                    </InputWrapper>
                                );
                            })}
                        </BoxInputs>
                    </Box>
                );
            })}
            {children}
        </Wrapper>
    );
};
