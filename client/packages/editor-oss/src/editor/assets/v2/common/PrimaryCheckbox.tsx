import classNames from "classnames";
import React from "react";
import "./css/PrimaryCheckbox.css";

type Props = {
  checked: boolean;
  onCheck: (checked: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  label?: string;
};
export const PrimaryCheckbox = ({
  checked,
  onCheck,
  className,
  style,
  label,
}: Props) => {
  return (
    <div
        className={classNames("PrimaryCheckbox", className)}
        style={style}
        onClick={() => onCheck(!checked)}
    >
      <div className={classNames("circle", checked && "active")} />
      {label && <div className="label">{label}</div>}
    </div>
  );
};
