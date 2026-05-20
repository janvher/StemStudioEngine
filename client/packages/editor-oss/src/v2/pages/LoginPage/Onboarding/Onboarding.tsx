import {useEffect, useState, useCallback} from "react";
import {useTranslation} from "react-i18next";

import {AcceptTOS} from "./AcceptTOS";
import {AvatarsGrid, SingleAvatar, Thumb} from "./AvatarsGrid.style";
import {ErrorMessage, InputWrapper, OnboardigSettings, OnboardingBox, UsernameInput} from "./Onboarding.style";
import {
    CatalogueAvatar,
    createMyPremadeAvatar,
    listCatalogueAvatarsHydrated,
    setMyDefaultAvatar,
} from "@stem/network/api/avatarCreator";
import {useAppGlobalContext, useAuthorizationContext} from "../../../../context";
import {StyledButton} from "../../../../editor/assets/v2/common/StyledButton";
import stemStudioLogo from "../../../../editor/assets/v2/icons/stem-logo.svg";
import {showToast} from "../../../../showToast";
import errorIcon from "../images/error.svg";
import successIcon from "../images/success.svg";
import {Top} from "../LoginBox/LoginBox.style";

interface Props {
    onCorrectAuth: () => void;
    setOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Onboarding = ({onCorrectAuth, setOnboarding}: Props) => {
    const {t} = useTranslation();
    const {validateUsername, saveUsernameInFirebase, dbUser} = useAuthorizationContext();
    const {setMainLoaderState} = useAppGlobalContext();
    const [username, setUsername] = useState("");
    const [isUsernameValid, setIsUsernameValid] = useState(false);
    const [tooShort, setTooShort] = useState(false);
    const [showValidationBorder, setShowValidationBorder] = useState(false);
    const [disabled, setDisabled] = useState(false);
    const [TOSAccepted, setTOSAccepted] = useState(false);

    const [avatars, setAvatars] = useState<CatalogueAvatar[] | null>(null);
    const [selectedAvatar, setSelectedAvatar] = useState<CatalogueAvatar | undefined>(undefined);
    const [showSpinner, setShowSpinner] = useState(false);

    const fetchAvatars = async () => {
        try {
            const list = await listCatalogueAvatarsHydrated();
            setAvatars(list);
            if (list.length > 0) {
                setSelectedAvatar(list[0]);
            }
        } catch (e) {
            showToast({type: "error", title: t("Failed to fetch avatars"), body: e instanceof Error ? e.message : undefined});
        }
    };

    useEffect(() => {
        if (!dbUser?.id) {
            return;
        }

        void fetchAvatars();
    }, [dbUser?.id]);

    useEffect(() => {
        const handlevalidateUsername = async () => {
            const usernameAvailable = await validateUsername(username);
            setIsUsernameValid(usernameAvailable);
            setTooShort(false);
            setShowValidationBorder(true);
        };
        if (username.length >= 3) {
            void handlevalidateUsername();
        } else {
            setIsUsernameValid(false);
            setTooShort(true);
        }
    }, [username]);

    const handleAvatarSelect = useCallback(
        (avatar: CatalogueAvatar) => {
            if (avatar === selectedAvatar) return;
            setSelectedAvatar(avatar);
        },
        [selectedAvatar],
    );

    const saveUsername = async () => {
        setDisabled(true);
        setShowSpinner(true);

        try {
            const usernameSuccess = await saveUsernameInFirebase(username);
            if (!usernameSuccess) {
                throw new Error(t("Failed to save username"));
            }

            if (selectedAvatar) {
                const record = await createMyPremadeAvatar({
                    assetId: selectedAvatar.assetId,
                    revisionId: selectedAvatar.revisionId,
                    name: selectedAvatar.name,
                    thumbnail: selectedAvatar.thumbnail ?? undefined,
                });
                await setMyDefaultAvatar(record.id);
            }

            window.location.replace(window.location.pathname + "?ftue=true");
            finishOnboarding();
        } catch (error) {
            console.error("Error during onboarding:", error);
            setDisabled(false);
        } finally {
            setShowSpinner(false);
        }
    };

    const finishOnboarding = () => {
        setOnboarding(false);
        onCorrectAuth();
    };

    useEffect(() => {
        if (dbUser?.username) {
            finishOnboarding();
        }
    }, [dbUser]);

    useEffect(() => {
        setMainLoaderState({visible: showSpinner || avatars === null, message: ""});
    }, [setMainLoaderState, showSpinner, avatars]);

    if (showSpinner) {
        return null;
    }
    const disabledButton =
        !isUsernameValid ||
        disabled ||
        !TOSAccepted ||
        (Array.isArray(avatars) && avatars.length > 0 && !selectedAvatar);

    return (
        <OnboardingBox>
            <Top className="top">
                <img
                    style={{height: "40px"}}
                    src={stemStudioLogo}
                    alt="Stem Studio"
                />
                <div className="pageName">{t("Finish setting up your account")}</div>
            </Top>
            <OnboardigSettings>
                <div className="description">{t("Set your username below")}</div>
                <InputWrapper>
                    <UsernameInput
                        value={username}
                        setValue={value => setUsername(value)}
                        height="40px"
                        placeholder={t("Username")}
                        $valueCorrect={showValidationBorder ? isUsernameValid : undefined}
                    />
                    {showValidationBorder && (
                        <img
                            className="icon"
                            src={isUsernameValid ? successIcon : errorIcon}
                            alt={isUsernameValid ? "username is available" : "username is not available"}
                        />
                    )}
                </InputWrapper>
                {!isUsernameValid && showValidationBorder && (
                    <ErrorMessage>
                        {tooShort ? t("Username is too short.") : t("Sorry! That username is already taken.")}
                    </ErrorMessage>
                )}
                <div className="description">{t("Choose your avatar")}</div>

                <AvatarsGrid>
                    {avatars?.map(avatar => (
                        <SingleAvatar
                            key={avatar.id}
                            onClick={() => handleAvatarSelect(avatar)}
                            $active={selectedAvatar?.id === avatar.id}
                        >
                            {avatar.thumbnail && (
                                <Thumb
                                    src={avatar.thumbnail}
                                    alt={avatar.name}
                                />
                            )}
                        </SingleAvatar>
                    ))}
                </AvatarsGrid>

                <AcceptTOS
                    setTOSAccepted={setTOSAccepted}
                    TOSAccepted={TOSAccepted}
                />

                <StyledButton
                    width="100%"
                    height="40px"
                    style={{color: "var(--theme-font-main-selected-color)", fontSize: "14px", borderRadius: "24px"}}
                    isPinkGradient
                    disabled={disabledButton}
                    onClick={saveUsername}
                >
                    {showSpinner ? t("Saving...") : t("Finish")}
                </StyledButton>
            </OnboardigSettings>
        </OnboardingBox>
    );
};
