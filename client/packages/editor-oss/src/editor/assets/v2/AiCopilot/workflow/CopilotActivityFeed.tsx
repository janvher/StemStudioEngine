import React from "react";

import {
    ActivityActionButton,
    ActivityChipList,
    ActivityDetail,
    ActivityFeedPanel,
    ActivityHeader,
    ActivityRow,
    ActivityStatusChip,
    ActivityTitle,
    PanelEyebrow,
} from "../AiCopilot.styles";

export type CopilotActivityFeedState = "done" | "active" | "idle" | "error";

export type CopilotActivityFeedItem = {
    label: string;
    state: CopilotActivityFeedState;
};

export type CopilotActivityFeedRow = {
    title?: string;
    detail?: string;
    items: CopilotActivityFeedItem[];
    action?: {
        label: string;
        onClick: () => void;
        disabled?: boolean;
    };
};

type Props = {
    rows: CopilotActivityFeedRow[];
};

export const CopilotActivityFeed = ({rows}: Props) => {
    return (
        <ActivityFeedPanel>
            <PanelEyebrow>Copilot Activity</PanelEyebrow>
            {rows.map((row, rowIndex) => (
                <ActivityRow key={`${rowIndex}-${row.items.map(item => item.label).join("-")}`}>
                    {(row.title || row.action) && (
                        <ActivityHeader>
                            <ActivityTitle>{row.title || "Copilot task"}</ActivityTitle>
                            {row.action && (
                                <ActivityActionButton
                                    type="button"
                                    onClick={row.action.onClick}
                                    disabled={row.action.disabled}
                                >
                                    {row.action.label}
                                </ActivityActionButton>
                            )}
                        </ActivityHeader>
                    )}
                    {row.detail && <ActivityDetail>{row.detail}</ActivityDetail>}
                    <ActivityChipList>
                        {row.items.map(item => (
                            <ActivityStatusChip
                                key={item.label}
                                $state={item.state}
                            >
                                {item.label}
                            </ActivityStatusChip>
                        ))}
                    </ActivityChipList>
                </ActivityRow>
            ))}
        </ActivityFeedPanel>
    );
};
