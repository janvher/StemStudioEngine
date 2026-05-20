/* eslint-disable @typescript-eslint/no-explicit-any */
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useLocation, useNavigate} from "react-router";
import styled from "styled-components";

import {useAuthorizationContext} from "../../../..//context";
import {isSignUpRoutePath, ROUTES} from "@web-shared/routes";
import {flexCenter} from "../../../../assets/style";
import {TextInput} from "../../../../editor/assets/v2/common/TextInput";
import {showToast} from "../../../../showToast";
import {PRODUCT_ANALYTICS_EVENTS, trackProductEvent} from "../../../../utils/productAnalytics";
import {verifyRecaptcha} from "../../../../utils/recaptcha";
import {RegisterPage} from "../../RegisterPage/RegisterPage";
import {resetPassword, signInWithEmail} from "../firebaseSignUp";
import {loginButtonCommonCss} from "../LoginPage.style";

export const InputLogin = () => {
    const {t} = useTranslation();
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const {getUser} = useAuthorizationContext();
    const navigate = useNavigate();
    const location = useLocation();

    const isSignUp = isSignUpRoutePath(location.pathname);
    const isForgotPassword = location.pathname === ROUTES.FORGOT_PASSWORD;

    const handleResetPassword = async () => {
        try {
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.PASSWORD_RESET_ATTEMPTED, {
                has_email: email.trim().length > 0,
            });
            await verifyRecaptcha("password_reset");
            const result = await resetPassword(email);

            if (result.status === "error") {
                showToast({
                    title: t("Authentication error"),
                    body: result.message || t("Something went wrong"),
                    type: "error",
                });
                return;
            }
            showToast({
                title: t("Reset password"),
                body: t("Check your email for reset link"),
                type: "success",
            });
            await navigate(ROUTES.LOGIN);
        } catch (error: any) {
            console.log("Pasword reset error:", error);
            showToast({
                title: t("Unexpected error occurred"),
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (isSignUp) return;

        if (isForgotPassword) {
            return handleResetPassword();
        }

        try {
            setLoading(true);
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_IN_ATTEMPTED, {
                method: "email",
                has_email: email.trim().length > 0,
            });
            await verifyRecaptcha("sign_in");

            const result = await signInWithEmail(email, password);
            if (result.status === "verification_required") {
                showToast({
                    title: t("Verify your email"),
                    body: t("We sent you a verification link"),
                    type: "info",
                    duration: 5000,
                });
                await navigate(ROUTES.LOGIN);
                return;
            }

            if (result.status === "error") {
                trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_IN_FAILED, {
                    method: "email",
                    reason: "email_password_error",
                });
                showToast({
                    title: t("Authentication error"),
                    body: result.message || t("Something went wrong"),
                    type: "error",
                });
                return;
            }
            if (result.status === "logged_in") {
                trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_IN_SUCCEEDED, {
                    method: "email",
                });
                await getUser();
            }
        } catch (error) {
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_IN_FAILED, {
                method: "email",
                reason: error instanceof Error ? error.message : "unexpected_error",
            });
            showToast({
                title: error instanceof Error ? error.message : t("Unexpected error occurred"),
                type: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    const getButtonLabel = () => {
        if (loading) return t("Loading...");
        if (isForgotPassword) return t("Reset password");
        if (isSignUp) return t("Sign up with email");
        return t("Sign in with email");
    };

    return (
        <Wrapper>
            {isSignUp ? (
                <RegisterPage />
            ) : (
                <LoginForm
                    onSubmit={e => {
                        e.preventDefault();
                        void handleSubmit();
                    }}
                >
                    <InputContainer>
                        <div className="label">{t("Email")}</div>
                        <TextInput
                            value={email}
                            setValue={value => setEmail(value)}
                            placeholder={t("Email")}
                            name="email"
                            autoComplete="email"
                        />
                    </InputContainer>
                    {!isForgotPassword && (
                        <InputContainer>
                            <div className="label">{t("Password")}</div>
                            <TextInput
                                value={password}
                                setValue={value => setPassword(value)}
                                placeholder={t("Password")}
                                type="password"
                                name="password"
                                autoComplete="current-password"
                            />
                        </InputContainer>
                    )}

                    <LoginButton
                        type="submit"
                        disabled={loading}
                        data-testid="login-email-submit"
                    >
                        {getButtonLabel()}
                    </LoginButton>
                </LoginForm>
            )}

            <SignUpInfo>
                {isSignUp ? (
                    <>
                        {t("Already have an account?")}
                        <button
                            className="link reset-css"
                            onClick={() => navigate(ROUTES.LOGIN)}
                        >
                            {t("Sign in")}
                        </button>
                    </>
                ) : (
                    <>
                        {t("Don't have an account yet?")}
                        <button
                            className="link reset-css"
                            onClick={() => navigate(ROUTES.REGISTER)}
                            data-testid="login-sign-up-link"
                        >
                            {t("Sign up")}
                        </button>
                    </>
                )}
            </SignUpInfo>

            {!isSignUp && !isForgotPassword && (
                <SignUpInfo style={{marginTop: "-8px"}}>
                    <button
                        className="link reset-css"
                        onClick={async () => {
                            setPassword("");
                            await navigate(ROUTES.FORGOT_PASSWORD);
                        }}
                    >
                        {t("Forgot password?")}
                    </button>
                </SignUpInfo>
            )}
        </Wrapper>
    );
};

const Wrapper = styled.div`
    width: 100%;
    ${flexCenter};
    flex-direction: column;
    row-gap: 16px;

    .TextInput {
        width: 100%;
        height: 44px;
        border-radius: 8px;
        background: var(--theme-grey-bg-secondary);
    }

    .label,
    .TextInput {
        color: #f8fafccc;
        font-size: 16px;
        font-weight: 400;
        letter-spacing: 0.32px;
    }

    .error {
        color: red;
        font-size: 13px;
        letter-spacing: 0.32px;
    }
`;

const LoginForm = styled.form`
    width: 100%;
    ${flexCenter};
    flex-direction: column;
    row-gap: 16px;
`;

export const LoginButton = styled.button`
    ${loginButtonCommonCss};
    margin: 0;
    border: 0.5px solid #02c782;
    background: rgba(2, 199, 130, 0.1);
    cursor: pointer;

    color: #f8fafccc;
    text-align: center;
    font-weight: 400;
`;

export const InputContainer = styled.div`
    width: 100%;
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
`;

const SignUpInfo = styled.div`
    width: 100%;
    ${flexCenter};
    column-gap: 4px;
    color: #f8fafccc;
    text-align: center;
    font-size: 12px;
    font-weight: 400;

    button {
        color: inherit;
        font-size: inherit;
        text-decoration: underline;
    }
`;
