import React from "react";
import "./css/TextInput.css";

interface Props {
    value: string;
    setValue?: (value: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement, Element>) => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
    width?: string;
    height?: string;
    textColor?: string;
    onEnter?: () => void;
    flex?: string;
    type?: "text" | "number" | "password";
    name?: string;
    autoComplete?: string;
}

export const TextInput = ({
    value,
    setValue,
    className,
    disabled,
    onBlur,
    onChange,
    placeholder,
    width,
    height,
    textColor,
    onEnter,
    flex,
    type,
    name,
    autoComplete,
}: Props) => {
    const style = {width, height, color: textColor, ...flex ? {flex: flex} : {}};
    return (
        <input
            className={className ? `${className} TextInput` : "TextInput"}
            type={type ?? "text"}
            name={name}
            autoComplete={autoComplete}
            value={value}
            onChange={e => {
                setValue?.(e.target.value);
                onChange?.(e);
            }}
            onBlur={e => onBlur?.(e)}
            disabled={disabled}
            placeholder={placeholder}
            style={style}
            onKeyDown={e => {
                if (e.key === "Enter") {
                    onEnter?.();
                }
            }}
        />
    );
};
