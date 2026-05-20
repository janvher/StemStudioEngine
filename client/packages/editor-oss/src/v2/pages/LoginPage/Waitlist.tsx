import {useEffect} from "react";
import {useTranslation} from "react-i18next";
import styled from "styled-components";

import {DiscordButton} from "./DiscordButton";
import logo from "./images/stem-studio.svg";
import {Bottom, StyledLoginBox, Top} from "./LoginBox/LoginBox.style";
import {loginButtonCommonCss} from "./LoginPage.style";
import {useAuthorizationContext} from "../../../context";
import {showToast} from "../../../showToast";

export const Waitlist = ({setShowWaitlist}: {setShowWaitlist: React.Dispatch<React.SetStateAction<boolean>>}) => {
    const {t} = useTranslation();
    const {handleLogOut} = useAuthorizationContext();

    useEffect(() => {
        showToast({
            type: "info",
            title: "You're on the waitlist!",
            body: "We'll send you an email once you're in.",
            duration: 5000,
        });
    }, []);
    return (
        <StyledLoginBox>
            <Top>
                <img
                    src={logo}
                    alt="EARTH.AI"
                />
            </Top>
            <Bottom style={{marginTop: "-24px"}}>
                <Info>
                    <div className="title">{t("You're on the Waitlist")}</div>
                    <div className="description">
                        {t("We'll let you know when we are ready for you. Thank you for your patience!")}
                    </div>
                </Info>
                <DiscordButton type="join" />
                <LogoutButton
                    onClick={() => {
                        handleLogOut();
                        setShowWaitlist(false);
                    }}
                >
                    {t("Logout")}
                </LogoutButton>
            </Bottom>
        </StyledLoginBox>
    );
};

const Info = styled.div`
    .title {
        color: #fff;
        font-size: 24px;
        font-weight: 600;
        line-height: 150%;
        white-space: nowrap;
    }
    .description {
        color: #fff;
        font-size: 16px;
        line-height: 120%;
        margin-top: 8px;
    }
`;

const LogoutButton = styled.button`
    background-color: transparent;
    text-align: center;
    ${loginButtonCommonCss};
    border: 0.5px solid #c9c7cf;
    box-shadow: 0 4px 0 2px #1f171440;

    color: #fff;
`;
