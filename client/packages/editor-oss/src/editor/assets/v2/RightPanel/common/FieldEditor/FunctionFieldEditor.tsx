import React from "react";

import {NumericInputRow} from "../NumericInputRow";
import {TextInputRow} from "../TextInputRow";

interface FunctionFieldEditorProps {
    label: string;
    fieldType: "function";
    value: unknown;
    onChange: (newValue: unknown) => void;
    disabled?: boolean;
    margin?: string;
}

export const FunctionFieldEditor: React.FC<FunctionFieldEditorProps> = ({
    label,
    value,
    onChange,
    disabled = false,
    margin,
}) => {
    // For function fields, we'll provide a simple implementation
    // This can be expanded based on specific three.quarks function types

    if (typeof value === "number") {
        return <NumericInputRow label={label}
            value={value}
            setValue={onChange}
            disabled={disabled}
            $margin={margin}
               />;
    }

    if (typeof value === "string") {
        return <TextInputRow label={label}
            value={value}
            setValue={onChange}
            margin={margin}
               />;
    }

    // For complex function objects, show as JSON for now
    // In a real implementation, this would have specialized editors
    return (
        <TextInputRow
            label={label}
            value={value ? JSON.stringify(value) : ""}
            setValue={stringValue => {
                try {
                    const parsed: unknown = JSON.parse(stringValue);
                    onChange(parsed);
                } catch {
                    // Keep string if not valid JSON
                    onChange(stringValue);
                }
            }}
            margin={margin}
            type="textarea"
        />
    );
};
