import {useState} from "react";
import styled from "styled-components";

import EngineRuntime from "@stem/editor-oss/EngineRuntime";
import {flexCenter, regularFont} from "../../../../assets/style";
import global from "@stem/editor-oss/global";
import {showToast} from "@stem/editor-oss/showToast";
import {useEscapeDismiss} from "../common/hooks/useEscapeDismiss";
import {TextInput} from "../common/TextInput";
import closeIcon from "../icons/close-panel.svg";

const ModalOverlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
`;

const ModalContent = styled.div`
    background-color: var(--theme-dialog-bg);
    border-radius: var(--theme-dialog-border-radius);
    border: none;
    box-shadow: var(--theme-dialog-shadow);
    width: 500px;
    max-width: 90%;
    min-height: 300px;
`;

const ModalHeader = styled.div`
    padding: 16px 20px;
    border-bottom: 1px solid var(--theme-container-divider);
    ${flexCenter};
    justify-content: space-between;
`;

const HeaderCloseButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s ease;

    &:hover {
        background: var(--theme-grey-bg);
    }

    img {
        width: 13px;
        height: auto;
    }
`;

const ModalTitle = styled.h3`
    ${regularFont("s")}
    font-weight: var(--theme-font-medium-plus);
    color: white;
    margin: 0;
`;

const ModalBody = styled.div`
    padding: 20px;
    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 16px;
`;

const Property = styled.div`
    ${flexCenter};
    align-items: flex-start;
    flex-direction: column;
    row-gap: 8px;
    width: 100%;
`;

const Label = styled.label`
    display: block;
    ${regularFont("s")};
    color: #a1a1aa;
    font-weight: var(--theme-font-medium-plus);
`;

const Input = styled(TextInput)`
    width: 100%;
    height: 36px;
    color: white;
    background-color: var(--theme-container-main-dark);
    border: 1px solid var(--theme-grey-bg);
    border-radius: 8px;
    padding: 0 12px;

    &:focus {
        border-color: var(--theme-container-active-blue);
        outline: none;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const ButtonsWrapper = styled.div`
    ${flexCenter};
    column-gap: 12px;
    width: 100%;
    margin-top: 8px;
`;

const CloseButton = styled.button`
    ${flexCenter};
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    height: 36px;
    padding: 0 16px;
    background-color: transparent;
    color: #a1a1aa;
    border: 1px solid var(--theme-grey-bg);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background-color: var(--theme-grey-bg);
        color: white;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

const SaveButton = styled.button`
    ${flexCenter};
    ${regularFont("s")};
    font-weight: var(--theme-font-medium-plus);
    height: 36px;
    padding: 0 16px;
    background-color: var(--theme-container-active-blue);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
        background-color: #2563eb;
    }

    &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;

interface Props {
    sceneId: string;
    onClose: (keysSaved: boolean) => void;
}

export const DiscordKeysModal = ({sceneId, onClose}: Props) => {
    const [clientId, setClientId] = useState("");
    const [clientSecret, setClientSecret] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const app = global.app as EngineRuntime;
    const authManager = app.authManager;

    const handleSave = async () => {
        if (!clientId.trim() || !clientSecret.trim()) {
            return;
        }

        setIsLoading(true);
        try {
            const {createGameMapping, getGameMapping, updateGameMapping} = await import("@stem/network/api/gameMapping");
            await authManager.discordSaveKeys(clientId.trim(), clientSecret.trim(), sceneId);
            const gameMappings = await getGameMapping(sceneId);
            if (gameMappings) {
                await updateGameMapping(sceneId, gameMappings.Slug, clientId.toLowerCase());
            } else {
                await createGameMapping(sceneId, undefined, clientId.toLowerCase());
            }
            onClose(true);
        } catch (error: unknown) {
            showToast({
                type: "error",
                body: `${(error as Error).message}`,
            });

            console.error("Error saving Discord keys:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        onClose(false);
    };
    useEscapeDismiss({onEscape: handleClose});

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    return (
        <ModalOverlay onClick={handleOverlayClick}>
            <ModalContent>
                <ModalHeader>
                    <ModalTitle>Configure Discord EngineRuntime</ModalTitle>
                    <HeaderCloseButton onClick={handleClose}
                        className="reset-css"
                    >
                        <img src={closeIcon}
                            alt="close"
                        />
                    </HeaderCloseButton>
                </ModalHeader>
                <ModalBody>
                    <Property>
                        <Label>Client ID</Label>
                        <Input
                            value={clientId}
                            setValue={v => setClientId(v)}
                            placeholder="Enter your Discord application Client ID"
                            disabled={isLoading}
                        />
                    </Property>
                    <Property>
                        <Label>Client Secret</Label>
                        <Input
                            value={clientSecret}
                            setValue={v => setClientSecret(v)}
                            placeholder="Enter your Discord application Client Secret"
                            disabled={isLoading}
                        />
                    </Property>
                    <ButtonsWrapper>
                        <CloseButton onClick={handleClose}
                            disabled={isLoading}
                        >
                            Cancel
                        </CloseButton>
                        <SaveButton
                            onClick={handleSave}
                            disabled={!clientId.trim() || !clientSecret.trim() || isLoading}
                        >
                            {isLoading ? "Saving..." : "Save"}
                        </SaveButton>
                    </ButtonsWrapper>
                </ModalBody>
            </ModalContent>
        </ModalOverlay>
    );
};
