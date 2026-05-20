import React from "react";
import "../css/CheckBox.css";
import classNames from "classnames";

interface Props {
    className?: string;
    style?: any;
    name: string;
    checked?: boolean;
    disabled?: boolean;
    onChange?: (checked: boolean, name: string, event?: any) => void;
}

const CheckBox = ({className, style, name, checked = false, disabled = false, onChange}: Props) => {
    const handleChange = (event: any) => {
        onChange && onChange(event.target.checked, name, event);
    };

    return (
        <input
            type="checkbox"
            className={classNames("CheckBox", checked && "checked", disabled && "disabled", className)}
            style={style}
            checked={checked}
            disabled={disabled}
            onChange={handleChange}
        />
    );
};

export default CheckBox;
