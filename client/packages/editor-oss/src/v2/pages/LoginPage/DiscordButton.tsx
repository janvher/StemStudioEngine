import {useTranslation} from "react-i18next";
import styled from "styled-components";

import {loginButtonCommonCss} from "./LoginPage.style";
import {showToast} from "../../../showToast";
import {PRODUCT_ANALYTICS_EVENTS, trackProductEvent} from "../../../utils/productAnalytics";
import {verifyRecaptcha} from "../../../utils/recaptcha";
import discordIconPurple from "../../assets/discord-purple.svg";
import discordIcon from "../../assets/discord-white.svg";
import {DISCORD_LINK} from "../constants";

type DiscordButtonType = "join" | "login";

interface DiscordButtonProps {
    $white?: boolean;
    $width?: string;
    $fontSize?: string;
    type: DiscordButtonType;
    signup?: boolean;
}

export const DiscordButton: React.FC<DiscordButtonProps> = ({$white, $width, $fontSize, type, signup = false}) => {
    const {t} = useTranslation();
    const isJoin = type === "join";

    // The "join" variant needs a Discord invite URL; without one (e.g. an
    // OSS fork that hasn't configured REACT_APP_DISCORD_URL) the button has
    // nothing to point at. The "login" variant uses Discord OAuth and is
    // controlled by its own env vars, so it stays.
    if (isJoin && !DISCORD_LINK) return null;

    const handleClick = async () => {
        if (isJoin) {
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.NAV_CLICK, {
                destination: "discord",
                source: "discord_join",
            });
            window.open(DISCORD_LINK, "_blank");
        } else {
            if (!process.env.REACT_ENGINE_DISCORD_CLIENT_ID) {
                showToast({type: "error", title: t("REACT_ENGINE_DISCORD_CLIENT_ID is missing")});
                return;
            }
            if (!process.env.REACT_ENGINE_DISCORD_REDIRECT_URI) {
                showToast({type: "error", title: t("REACT_ENGINE_DISCORD_REDIRECT_URI is missing")});
                return;
            }
            if (!process.env.REACT_ENGINE_DISCORD_REDIRECT_URI.includes("/login")) {
                showToast({
                    type: "error",
                    title: t("REACT_ENGINE_DISCORD_REDIRECT_URI is incorrect. Should point to /login"),
                });
                return;
            }
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.OAUTH_ATTEMPTED, {
                provider: "discord",
                signup,
            });
            try {
                await verifyRecaptcha(signup ? "sign_up" : "sign_in");
            } catch (error) {
                showToast({
                    type: "error",
                    title: error instanceof Error ? error.message : t("Bot verification failed. Please try again."),
                });
                return;
            }
            const discordAuthUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.REACT_ENGINE_DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.REACT_ENGINE_DISCORD_REDIRECT_URI)}&response_type=code&scope=identify%20email`;
            window.location.href = discordAuthUrl;
        }
    };

    return (
        <StyledDiscordButton
            id="discordButton"
            className="DiscordButton"
            onClick={handleClick}
            $fontSize={$fontSize}
            $white={$white}
            $width={$width}
            data-testid={isJoin ? "discord-join-button" : "discord-auth-button"}
        >
            {$white ? (
                <img
                    src={discordIconPurple}
                    alt=""
                    className="icon"
                />
            ) : (
                <img
                    src={discordIcon}
                    alt=""
                    className="icon"
                />
            )}
            {isJoin ? t("Join our Discord") : signup ? t("Sign up with Discord") : t("Sign in with Discord")}
        </StyledDiscordButton>
    );
};

const StyledDiscordButton = styled.button<Pick<DiscordButtonProps, "$white" | "$width" | "$fontSize">>`
    ${loginButtonCommonCss};
    background-color: ${({$white}) => ($white ? "#fff" : "#5865f2")} !important;
    ${({$width}) => ($width ? `width: ${$width}` : "width: 100%")};
    text-align: center;
    column-gap: 8px;
    border: none;

    white-space: nowrap;
    transition: all 0.2s;
    cursor: pointer;

    color: ${({$white}) => ($white ? "#3F3F46" : "#f8fafccc")};
    ${({$fontSize}) => $fontSize && `font-size: ${$fontSize}`};

    &:hover {
        transform: translateY(-1px);
        background-color: ${({$white}) => ($white ? "#f4f4f5" : "#4752c4")} !important;
    }

    &:active {
        transform: translateY(0);
    }

    .icon {
        width: 31px;
    }
`;
