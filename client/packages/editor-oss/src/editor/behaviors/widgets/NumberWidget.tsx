import React, {useState, useEffect, useRef, useCallback} from "react";
import styled from "styled-components";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {NumericInputRow} from "../../../editor/assets/v2/RightPanel/common/NumericInputRow";
import {showToast} from "@stem/editor-oss/showToast";
import {NumberAttribute} from "../BehaviorAttributes";

/**
 * Calculate decimal places from a step value
 * e.g., step 0.01 = 2 decimal places, step 0.1 = 1 decimal place
 * @param step
 */
const getDecimalPlacesFromStep = (step: number): number => {
    if (step >= 1) return 0;
    const stepStr = step.toString();
    const decimalIndex = stepStr.indexOf(".");
    if (decimalIndex === -1) return 0;
    return stepStr.length - decimalIndex - 1;
};

/**
 * Clamp value to min/max bounds
 * @param value
 * @param min
 * @param max
 */
const clampValue = (value: number, min: number, max: number): number => {
    if (value < min) return min;
    if (value > max) return max;
    return value;
};

const NumberWidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => number;
    updateBehaviorField: (value: number) => void;
    min: number;
    max: number;
    step?: number;
}> = ({label, getCurrentValue, updateBehaviorField, min, max, step}) => {
    const initialValue = getCurrentValue() ?? 0;
    const [localValue, setLocalValue] = useState(initialValue);
    const [committedValue, setCommittedValue] = useState(initialValue);
    const updateBehaviorFieldRef = useRef(updateBehaviorField);
    // Track recently committed value to prevent race conditions with external sync
    const lastCommittedValueRef = useRef<number | null>(null);

    // Calculate decimal places from step
    const decimalPlaces = step !== undefined ? getDecimalPlacesFromStep(step) : undefined;

    // Check if value has changed from committed value
    const isDirty = localValue !== committedValue;

    // Keep the ref updated with the latest callback
    useEffect(() => {
        updateBehaviorFieldRef.current = updateBehaviorField;
    }, [updateBehaviorField]);

    // Sync with external value changes (e.g., from reset button)
    // Only sync if not currently editing (isDirty) and not our own recent commit
    const currentExternalValue = getCurrentValue() ?? 0;
    useEffect(() => {
        // While a commit is in flight, never pull external value into local state.
        // Without this guard, the parent's re-render lags the NumberWidget re-render
        // by one cycle, so getCurrentValue() still returns the old value on the first
        // render after commit — the sync branch below would then clobber our just-committed
        // value, requiring the user to press Apply a second time.
        if (lastCommittedValueRef.current !== null) {
            if (currentExternalValue === lastCommittedValueRef.current) {
                lastCommittedValueRef.current = null;
            }
            return;
        }

        if (currentExternalValue !== committedValue && !isDirty) {
            setLocalValue(currentExternalValue);
            setCommittedValue(currentExternalValue);
        }
    }, [currentExternalValue, committedValue, isDirty]);

    const handleLocalChange = useCallback((newValue: number) => {
        // Update local state immediately for responsive UI
        setLocalValue(newValue);
    }, []);

    const commitValue = useCallback(() => {
        // Clamp value to bounds before committing
        const clampedValue = clampValue(localValue, min, max);

        // Show toast if value was clamped
        if (localValue !== clampedValue) {
            showToast({
                title: "Value adjusted",
                body: `${label} can have a value between ${min} and ${max}, adjusting to ${clampedValue}`,
                type: "info",
            });
        }

        // Store the committed value to prevent race conditions
        lastCommittedValueRef.current = clampedValue;

        // Update state
        setLocalValue(clampedValue);
        setCommittedValue(clampedValue);

        // Notify behavior system
        updateBehaviorFieldRef.current(clampedValue);
    }, [localValue, min, max, label]);

    const handleBlur = useCallback(() => {
        if (isDirty) {
            commitValue();
        }
    }, [isDirty, commitValue]);

    const handleTickClick = useCallback(() => {
        commitValue();
    }, [commitValue]);

    return (
        <Wrapper>
            <InputContainer>
                <NumericInputRow
                    label={label}
                    value={localValue}
                    setValue={handleLocalChange}
                    onBlur={handleBlur}
                    min={min}
                    max={max}
                    dragStep={step}
                    decimalPlaces={decimalPlaces}
                    $margin="0"
                />
            </InputContainer>
            {isDirty && (
                <TickButton
                    onClick={handleTickClick}
                    onMouseDown={e => e.preventDefault()} // Prevent blur before click
                    title="Apply value"
                >
                    ✓
                </TickButton>
            )}
        </Wrapper>
    );
};

const Wrapper = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 4px;
    width: 100%;

    .numericInputWrapper {
        min-width: unset;
        width: min-content;
        flex-grow: 1;
    }
`;

const InputContainer = styled.div`
    flex: 1;
`;

const TickButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    min-width: 24px;
    margin-top: 2px;
    border: none;
    border-radius: 4px;
    background-color: var(--theme-accent-color, #0284c7);
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: background-color 0.15s ease;

    &:hover {
        background-color: var(--theme-accent-color-hover, #0369a1);
    }

    &:active {
        background-color: var(--theme-accent-color-active, #075985);
    }
`;

class NumberWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-number";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: NumberAttribute,
        getCurrentValue: () => number,
        updateBehaviorField: (value: number) => void,
    ): React.ReactElement {
        return (
            <NumberWidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
                min={attribute.min ?? Number.MIN_SAFE_INTEGER}
                max={attribute.max ?? Number.MAX_SAFE_INTEGER}
                step={attribute.step}
            />
        );
    }
}

export default NumberWidget;
