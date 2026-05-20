import {ResetButton, SectionHeaderWrapper} from "./DefaultLightsAndFogPanel.style";
import {Tooltip} from "../../../../common";
import {PanelSectionTitle} from "../../../RightPanel.style";

interface SectionHeaderProps {
    title: string;
    showReset: boolean;
    onReset: () => void;
    tooltip?: string;
}

const ResetIcon = () => (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.5 8c-2.65 0-5.05 1.04-6.83 2.73L3 8v8h8l-2.81-2.81c1.31-1.3 3.11-2.1 5.09-2.1 3.21 0 5.94 2.12 6.86 5.03l1.73-.58C20.73 11.79 17.04 8 12.5 8z" />
    </svg>
);

export const SectionHeader = ({title, showReset, onReset, tooltip}: SectionHeaderProps) => (
    <SectionHeaderWrapper>
        <div style={{display: "flex", alignItems: "center", gap: 4}}>
            <PanelSectionTitle>{title}</PanelSectionTitle>
            {tooltip && <Tooltip text={tooltip} />}
        </div>
        <ResetButton $visible={showReset} onClick={onReset}>
            <ResetIcon />
        </ResetButton>
    </SectionHeaderWrapper>
);
