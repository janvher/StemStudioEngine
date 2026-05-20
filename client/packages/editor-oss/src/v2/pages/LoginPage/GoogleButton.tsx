import {debounce} from "lodash";
import {useCallback} from "react";
import {useTranslation} from "react-i18next";
import styled from "styled-components";

import {loginButtonCommonCss} from "./LoginPage.style";
import {getAuthProvider} from "../../../auth";
import {showToast} from "../../../showToast";
import {PRODUCT_ANALYTICS_EVENTS, trackProductEvent} from "../../../utils/productAnalytics";
import {verifyRecaptcha} from "../../../utils/recaptcha";
import googleicon from "../../assets/google-icon.svg";

export const GoogleButton = ({signup}: {signup?: boolean}) => {
    const {t} = useTranslation();

    const signInWithGoogle = async () => {
        trackProductEvent(PRODUCT_ANALYTICS_EVENTS.OAUTH_ATTEMPTED, {
            provider: "google",
            signup: signup === true,
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

        try {
            await getAuthProvider().signInWithGoogle();
        } catch (error) {
            const e = error as {code?: string; message?: string};
            showToast({type: "error", title: t("Request failed.")});
            console.log(`Error from google sign in. Code: ${e.code ?? ""} Msg: ${e.message ?? ""}`);
        }
    };

    const debouncedOnClick = useCallback(debounce(() => void signInWithGoogle(), 500), [signup, t]);

    return (
        <StyledGoogleButton
            id="GoogleButton"
            className="GoogleButton reset-css"
            onClick={debouncedOnClick}
            data-testid="google-auth-button"
        >
            <img
                src={googleicon}
                alt=""
                className="icon"
            />
            {signup ? t("Sign up with Google") : t("Sign in with Google")}
        </StyledGoogleButton>
    );
};

const StyledGoogleButton = styled.button`
    background-color: #f8f6fe !important;
    text-align: center;
    ${loginButtonCommonCss};
    border: 0.5px solid #c9c7cf;

    color: #0000008a;
`;
