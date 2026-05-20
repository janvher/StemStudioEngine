import React from "react";
import {useTranslation} from "react-i18next";

import warningIcon from "./icons/warning.svg";
import xIcon from "./icons/x-btn.svg";
import {
    UILogin,
    LoginContainer,
    LoginForm,
    LoginHeader,
    SubmitBtn,
    LoginButton,
    InputWrapper,
    ReminderMessage,
} from "./InGameLogin.style";
import {getAuthProvider, type IAuthUser} from "../../../auth";
import EventBus, { IN_GAME_EVENTS } from "../../../behaviors/event/EventBus";
import global from "../../../global";
import { IUser } from "../../../userManagement/types";
import appleicon from "../../../v2/assets/apple-icon.svg";
import googleicon from "../../../v2/assets/google-icon.svg";

interface ButtonConfig {
    component: React.FC<any>;
    text: string;
    icon?: string;
    action: () => void;
    $apple?: boolean;
    $guest?: boolean;
    or?: boolean;
}

export type LoginProviderType = "email" | "google" | "apple" | "guest" | "discord";

export interface GameLoginData {
    username: string;
    email: string | null;
    avatarUrl?: string | null;
    provider: LoginProviderType;
    token: string | null;
    isGuest: boolean;
}

interface Props {
    isReminder: boolean;
    cleanupPopup: () => void
    setIsGuest: React.Dispatch<React.SetStateAction<boolean>>
}

export const InGameLogin = ({ isReminder, cleanupPopup, setIsGuest }: Props) => {
    const {t} = useTranslation();

    const closePopup = (userData: GameLoginData) => {
        setIsGuest(userData.isGuest);
        EventBus.instance.send(IN_GAME_EVENTS.GAME_LOGIN_SUCCESS, userData);
        cleanupPopup();
    };

    const generateGuestUsername = () => {
        const randomNumber = Math.floor(10000 + Math.random() * 90000);
        return `guest${randomNumber}`;
    };

    const guestLogin = () => {
        const userData: GameLoginData = {
            username: generateGuestUsername(),
            email: null,
            provider: "guest",
            token: null,
            isGuest: true,
            avatarUrl: "",
        };
        closePopup(userData);
    };

    const appleLogin = async () => {
        const authUser = await getAuthProvider().signInWithOAuth("apple.com", ["name", "email"]);
        if (!authUser) {
            throw new Error("No user returned from login");
        }

        const idToken = await authUser.getIdToken();
        onAuthCompleted(authUser, idToken);

        // MVP - pass token to game. Later replace with backend-issued access token
        const userData: GameLoginData = {
            username: authUser.displayName || authUser.email?.split("@")[0] || generateGuestUsername(),
            email: authUser.email || null,
            provider: "google", //TODO: switch back to "apple" when Farm game is updated
            token: idToken,
            isGuest: false,
            avatarUrl: authUser.photoURL,
        };

        closePopup(userData);
    };

    const googleLogin = async () => {
        const provider = getAuthProvider();
        try {
            const current = provider.getCurrentUser();

            if (current && !current.isAnonymous) {
                const idToken = await current.getIdToken();
                onAuthCompleted(current, idToken);
                closePopup({
                    username: current.displayName || current.email?.split("@")[0] || generateGuestUsername(),
                    email: current.email || null,
                    provider: "google",
                    token: idToken,
                    isGuest: false,
                    avatarUrl: current.photoURL,
                });
                return;
            }

            const authUser = await provider.signInWithGoogle();

            if (!authUser) {
                throw new Error("No user returned from login");
            }

            const idToken = await authUser.getIdToken();
            onAuthCompleted(authUser, idToken);

            // MVP - pass token to game. Later replace with backend-issued access token
            const userData: GameLoginData = {
                username: authUser.displayName || authUser.email?.split("@")[0] || generateGuestUsername(),
                email: authUser.email || null,
                provider: "google",
                token: idToken,
                isGuest: false,
                avatarUrl: authUser.photoURL,

            };

            closePopup(userData);
        } catch (error) {
            console.error(`Google login failed:`, error);
        }
    };

    const onAuthCompleted = (authUser: IAuthUser, token: string) => {
        //set user and token
        const user: IUser = {
            id: authUser.uid,
            name: authUser.displayName ?? "guest",
            email: authUser.email,
            firebaseId: authUser.uid,
            avatar: "",
            username: authUser.displayName,
            token: token,
            isGuest: authUser.isAnonymous,
            platform: "firebase",
        };
        console.log("[IN_GAME_AUTH] setting user and token", authUser, user, token);
        global.app?.authManager.setUserAndToken(user, token);
    };
    //Removed guest button.
    const BUTTONS: ButtonConfig[] = [
        { component: LoginButton, text: t("Login with Google"), icon: googleicon, action: googleLogin },
        { component: LoginButton, text: t("Login with Apple"), icon: appleicon, $apple: true, action: appleLogin },
        // { component: SubmitBtn, text: "LOGIN AS GUEST", $guest: true, action: guestLogin },
    ];

    return (
        <UILogin>
            <LoginContainer>
                <LoginForm>
                    <LoginHeader>{isReminder ? <>
                        <img className="warningIcon"
                            src={warningIcon}
                            alt=""
                        />
                        {t("Warning")}
                        <button className="reset-css closeButton"
                            onClick={cleanupPopup}
                        ><img className="xIcon"
                            src={xIcon}
                            alt=""
                        /></button>
                    </>
                        : t("Log In")}
                    </LoginHeader>
                    <InputWrapper>
                        {isReminder &&
                            <ReminderMessage>
                                {t("Not signed in")} <br /> {t("Log in now to save garden progress")}
                            </ReminderMessage>
                        }
                    </InputWrapper>
                    {BUTTONS.map((btn, index) => {
                        const Component = btn.component;
                        if (isReminder && btn.$guest) return;
                        return (
                            <React.Fragment key={index}>
                                <Component
                                    $apple={btn.$apple}
                                    $guest={btn.$guest}
                                    className='no-highligh'
                                    onClick={btn.action}
                                >
                                    {btn.icon && <img src={btn.icon}
                                        alt=""
                                        className="icon"
                                                 />}
                                    <span className="btnLabel">{btn.text}</span>
                                </Component>
                            </React.Fragment>
                        );
                    })}
                </LoginForm>
            </LoginContainer>
        </UILogin>
    );
};
