/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from "axios";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {useNavigate} from "react-router-dom";

import {FormField, RegisterForm, RowFields, Select, SuccessMessage} from "./RegisterPage.style";
import {ROUTES} from "@web-shared/routes";
import {StyledButton} from "../../../editor/assets/v2/common/StyledButton";
import {TextInput} from "../../../editor/assets/v2/common/TextInput";
import {showToast} from "../../../showToast";
import {PRODUCT_ANALYTICS_EVENTS, trackProductEvent} from "../../../utils/productAnalytics";
import {verifyRecaptcha} from "../../../utils/recaptcha";
import {signUpWithEmail} from "../LoginPage/firebaseSignUp";
import {InputContainer, LoginButton} from "../LoginPage/LoginBox/InputLogin";

const ROLE_OPTIONS = ["3D Artist", "Game Developer", "Tech Enthusiast", "Content Creator", "Other"];
const AI_FAMILIARITY_OPTIONS = ["Not familiar", "Somewhat familiar", "Very familiar"];

export interface IForm {
    firstName: string;
    lastName: string;
    company: string;
    email: string;
    role: string;
    aiFamiliarity: string;
}

export const RegisterPage = () => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState<IForm>({
        firstName: "",
        lastName: "",
        company: "",
        email: "",
        role: "",
        aiFamiliarity: "",
    });
    const [password, setPassword] = useState<string>("");
    const [passwordError, setPasswordError] = useState<string>("");
    const [emailError, setEmailError] = useState<string>("");
    const requiredFieldMissing = !form.firstName || !form.lastName || !form.email || !form.role || !form.aiFamiliarity;

    const updateField = (field: string, value: string) => {
        setForm(prev => ({...prev, [field]: value}));
    };

    const validateEmail = (value: string): boolean => {
        return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    };

    const validatePassword = (value: string): boolean => {
        return /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(value);
    };

    const fieldHasError = () => {
        let hasError = false;

        if (!validateEmail(form.email)) {
            setEmailError(t("Invalid email format"));
            hasError = true;
        }

        if (!validatePassword(password)) {
            setPasswordError(t("Min 8 characters and at least 1 number"));
            hasError = true;
        }
        return hasError;
    };

    const handleSubmit = async () => {
        setEmailError("");
        setPasswordError("");

        if (requiredFieldMissing) {
            showToast({type: "warning", title: "Please fill in all required fields."});
            return;
        }
        setLoading(true);
        try {
            if (fieldHasError()) return;
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_UP_ATTEMPTED, {
                method: "email",
                role: form.role,
                ai_familiarity: form.aiFamiliarity,
            });

            if (!validatePassword(password)) {
                setPasswordError(t("Min 8 characters and at least 1 number"));
                return;
            }

            await verifyRecaptcha("sign_up");
            const signUpResult = await signUpWithEmail(form, password);
            if (signUpResult.status === "error") {
                trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_UP_FAILED, {
                    method: "email",
                    reason: "email_password_error",
                });
                showToast({
                    title: t("Signup error"),
                    body: signUpResult.message,
                    type: "error",
                });
                return;
            }
            if (signUpResult.status === "verification_required") {
                trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_UP_SUCCEEDED, {
                    method: "email",
                    verification_required: true,
                    role: form.role,
                });
                showToast({
                    title: t("Verify your email"),
                    body: t("We sent you a verification link"),
                    type: "info",
                });
                return await navigate(ROUTES.LOGIN);
            }

            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_UP_SUCCEEDED, {
                method: "email",
                verification_required: false,
                role: form.role,
            });
            setSubmitted(true);
        } catch (error) {
            // eslint-disable-next-line import/no-named-as-default-member
            const message = axios.isAxiosError(error)
                ? error.response?.data?.Msg || "Failed to submit registration."
                : error instanceof Error
                  ? error.message
                  : "Failed to submit registration.";
            showToast({type: "error", title: message});
            trackProductEvent(PRODUCT_ANALYTICS_EVENTS.SIGN_UP_FAILED, {
                method: "email",
                reason: message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {submitted ? (
                <SuccessMessage>
                    <span className="title">{t("Registration submitted!")}</span>
                    <span className="subtitle">
                        {t("Your registration has been submitted. We'll review it shortly.")}
                    </span>
                    <StyledButton
                        width="120px"
                        height="40px"
                        onClick={() => navigate(ROUTES.HOME)}
                        isBlue
                    >
                        {t("Back to Home")}
                    </StyledButton>
                </SuccessMessage>
            ) : (
                <RegisterForm
                    onSubmit={e => {
                        e.preventDefault();
                        void handleSubmit();
                    }}
                >
                    <RowFields>
                        <InputContainer>
                            <div className="label">{t("First name *")}</div>
                            <TextInput
                                value={form.firstName}
                                setValue={value => updateField("firstName", value)}
                                placeholder={t("First name")}
                                name="given-name"
                                autoComplete="given-name"
                            />
                        </InputContainer>
                        <InputContainer>
                            <div className="label">{t("Last name *")}</div>
                            <TextInput
                                value={form.lastName}
                                setValue={value => updateField("lastName", value)}
                                placeholder={t("Last name")}
                                name="family-name"
                                autoComplete="family-name"
                            />
                        </InputContainer>
                    </RowFields>

                    <InputContainer>
                        <div className="label">{t("Email *")}</div>
                        <TextInput
                            value={form.email}
                            setValue={value => updateField("email", value.toLowerCase())}
                            placeholder="you@example.com"
                            name="email"
                            autoComplete="email"
                        />
                        {emailError && <div className="error">{emailError}</div>}
                    </InputContainer>

                    <InputContainer>
                        <div className="label">{t("Password")}</div>
                        <TextInput
                            value={password}
                            setValue={value => setPassword(value)}
                            placeholder={t("Password")}
                            type="password"
                            name="new-password"
                            autoComplete="new-password"
                        />
                        {passwordError && <div className="error">{passwordError}</div>}
                    </InputContainer>

                    <InputContainer>
                        <div className="label">{t("Company")}</div>
                        <TextInput
                            value={form.company}
                            setValue={value => updateField("company", value)}
                            placeholder={t("Company (optional)")}
                            name="organization"
                            autoComplete="organization"
                        />
                    </InputContainer>

                    <FormField>
                        <label>{t("What do you do? *")}</label>
                        <Select
                            value={form.role}
                            onChange={e => updateField("role", e.target.value)}
                        >
                            <option
                                value=""
                                disabled
                            >
                                {t("Select a role")}
                            </option>
                            {ROLE_OPTIONS.map(opt => (
                                <option
                                    key={opt}
                                    value={opt}
                                >
                                    {t(opt)}
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <FormField>
                        <label>{t("AI familiarity *")}</label>
                        <Select
                            value={form.aiFamiliarity}
                            onChange={e => updateField("aiFamiliarity", e.target.value)}
                        >
                            <option
                                value=""
                                disabled
                            >
                                {t("Select familiarity level")}
                            </option>
                            {AI_FAMILIARITY_OPTIONS.map(opt => (
                                <option
                                    key={opt}
                                    value={opt}
                                >
                                    {t(opt)}
                                </option>
                            ))}
                        </Select>
                    </FormField>

                    <LoginButton
                        type="submit"
                        disabled={loading || requiredFieldMissing}
                        data-testid="register-submit"
                    >
                        {loading ? t("Submitting...") : t("Sign up")}
                    </LoginButton>
                </RegisterForm>
            )}
        </>
    );
};
