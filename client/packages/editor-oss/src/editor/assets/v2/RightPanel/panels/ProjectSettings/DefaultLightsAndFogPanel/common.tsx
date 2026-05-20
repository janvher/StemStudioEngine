import {Tooltip} from "../../../../common";
import {NumericInput} from "../../../../common/NumericInput";
import {PanelSectionTitleSecondary} from "../../../RightPanel.style";

export const Row = ({children}: {children: React.ReactNode}) => 
    <div className="box"
        style={{display: "flex", alignItems: "center", gap: 8}}
    >
        {children}
    </div>
;

export const ColorRow = ({
    label,
    color,
    onClick,
    labelTooltip,
}: {
    label: string;
    color: string;
    onClick: () => void;
    labelTooltip?: React.ReactNode;
}) =>
    <Row>
        <div style={{display: "flex", alignItems: "center", gap: 4}}>
            <PanelSectionTitleSecondary>{label}</PanelSectionTitleSecondary>
            {labelTooltip ? <Tooltip content={labelTooltip} stayOpenOnHover maxWidth="360px" /> : null}
        </div>
        <div className="color-box"
            style={{backgroundColor: color}}
            onClick={onClick}
        />
    </Row>
;

export const NumberRow = ({
    label,
    value,
    onChange,
    min,
    max,
    decimalPlaces,
    labelTooltip,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    decimalPlaces?: number;
    labelTooltip?: React.ReactNode;
}) => 
    <Row>
        <div style={{display: "flex", alignItems: "center", gap: 4}}>
            <PanelSectionTitleSecondary>{label}</PanelSectionTitleSecondary>
            {labelTooltip ? <Tooltip content={labelTooltip} stayOpenOnHover maxWidth="360px" /> : null}
        </div>
        <NumericInput
            className="numeric-input"
            value={Number(value)}
            setValue={v => onChange(Number(v))}
            min={min}
            max={max}
            decimalPlaces={decimalPlaces}
            width="60px"
        />
    </Row>
;
