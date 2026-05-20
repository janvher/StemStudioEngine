import {useEffect, useState} from "react";
import styled from "styled-components";

import {useAuthorizationContext} from "@stem/editor-oss/context";
import {IS_OSS} from "@stem/editor-oss";
import {isStripeCreditsPurchasingEnabled} from "@stem/editor-oss/utils/featureFlags";
import {CreditsPurchaseModal} from "../CreditsPurchaseModal/CreditsPurchaseModal";

type CreditsLevel = "ok" | "warning" | "critical";

const StyledCreditsBar = styled.div<{$level?: CreditsLevel; $clickable?: boolean}>`
    font-size: 11px;
    font-weight: 500;
    padding: 4px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.05);
    user-select: none;
    transition: color 0.3s ease, background 0.2s ease;
    color: ${({$level}) =>
        $level === "critical" ? "#f87171" : $level === "warning" ? "#fbbf24" : "rgba(255,255,255,0.6)"};
    cursor: ${({$clickable}) => ($clickable ? "pointer" : "default")};

    ${({$clickable}) =>
        $clickable &&
        `&:hover {
        background: rgba(255, 255, 255, 0.1);
    }`}

    span {
        font-weight: 600;
        color: inherit;
    }
`;

type Props = {
    className?: string;
};

export const CreditsBar = ({className}: Props) => {
    const {aiCredits, refreshAiCredits} = useAuthorizationContext();
    const [modalOpen, setModalOpen] = useState(false);
    const purchaseEnabled = isStripeCreditsPurchasingEnabled();

    useEffect(() => {
        // OSS builds have no billing pipeline. Skip the refresh tick;
        // the early-return below hides the indicator entirely.
        if (IS_OSS) return;
        void refreshAiCredits();
    }, []);

    // Hide the indicator in OSS so the editor topbar shows nothing
    // payment-flavoured. The hooks above run unconditionally to satisfy
    // React's rules-of-hooks.
    if (IS_OSS) return null;

    const level: CreditsLevel =
        aiCredits !== null && aiCredits <= 50 ? "critical" : aiCredits !== null && aiCredits <= 200 ? "warning" : "ok";

    return (
        <>
            <StyledCreditsBar
                className={className}
                title={purchaseEnabled ? "Click to buy AI credits" : "Remaining AI credits"}
                $level={level}
                $clickable={purchaseEnabled}
                onClick={purchaseEnabled ? () => setModalOpen(true) : undefined}
            >
                ⚡ <span>{aiCredits ?? "—"}</span>
            </StyledCreditsBar>
            {modalOpen && <CreditsPurchaseModal onClose={() => setModalOpen(false)} />}
        </>
    );
};
