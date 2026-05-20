import {useLocation} from "react-router-dom";
import {useTranslation} from "react-i18next";

import {Bottom, Footer, Or, StyledLoginBox, Top} from "./LoginBox.style";
import {isSignUpRoutePath, ROUTES} from "@web-shared/routes";
import logo from "../../../assets/logo.svg";
import {DiscordButton} from "../DiscordButton";
import {GoogleButton} from "../GoogleButton";
import stemStudioLogo from "../images/stem-studio.svg";
import {TOSText} from "../TOSText";
import {InputLogin} from "./InputLogin";

interface Props {
    navigationOptions: {
        state: {
            from: ROUTES;
        };
    };
}

export const LoginBox = ({navigationOptions}: Props) => {
    const {t} = useTranslation();
    const location = useLocation();
    const signup = isSignUpRoutePath(location.pathname);
    const forgotPassword = location.pathname === ROUTES.FORGOT_PASSWORD;

    return (
        <>
            <StyledLoginBox>
                <Top>
                    {signup ? t("Sign up for") : t("Log into")}
                    <img
                        src={stemStudioLogo}
                        alt="Stem Studio"
                        className="stemLogo"
                    />
                </Top>
                <Bottom>
                    {!forgotPassword && (
                        <>
                            <GoogleButton signup={signup} />
                            <DiscordButton
                                type="login"
                                signup={signup}
                            />
                            <Or>{t("or")}</Or>
                        </>
                    )}
                    <InputLogin />

                    <Footer>
                        <TOSText navigationOptions={navigationOptions} />
                        <img
                            src={logo}
                            alt="StemStudio"
                            className="erthLogo"
                        />
                    </Footer>
                </Bottom>
            </StyledLoginBox>
        </>
    );
};
