import styled from "styled-components";

import {AppVersion} from "./AppVersion/AppVersion";
import {StyledNav, LeftSide, Right, InGameButton} from "./FloatingNav.style";
import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {ROUTES} from "@web-shared/routes";
import global from "@stem/editor-oss/global";
import PlatformNavigation from "@stem/editor-oss/utils/PlatformNavigation";
import {Section} from "../../../common/Section";

export const FloatingNavGuestView = () => {
    const app = global.app as EngineRuntime;
    const sceneName = app.editor?.sceneName;

    const handleJoinClick = async () => {
        try {
            const success = await PlatformNavigation.openUrl(ROUTES.LOGIN);
            if (!success) {
                console.warn("Failed to open login URL with platform navigation, trying fallback");
                // Fallback to window.open if platform navigation fails
                window.open(ROUTES.LOGIN, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error("Error opening login URL:", error);
            // Final fallback to window.open
            window.open(ROUTES.LOGIN, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <>
            <StyledNav>
                <StyledLeftSide>
                    <Section $gap="4px"
                        $direction="row"
                        $width="100%"
                        $align="center"
                    >
                        <span className="sceneName">{sceneName}</span>
                    </Section>
                </StyledLeftSide>
                <Right>
                    <InGameButton
                        onClick={handleJoinClick}
                        $background="#FAFAFA"
                        style={{color: "#27272A"}}
                    >
                        Join StemStudio
                    </InGameButton>
                </Right>
            </StyledNav>
            <AppVersion />
        </>
    );
};

const StyledLeftSide = styled(LeftSide)`
    width: auto;
    maxwidth: 203px;
    padding: 12px 16px;
`;
