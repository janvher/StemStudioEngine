import {useCallback} from "react";
import styled from "styled-components";

import {BYOKKeysPanel} from "../CreateDashboard/SettingsPage/BYOKKeysPanel/BYOKKeysPanel";

/**
 * AiKeysModal — lets a playground visitor configure their own AI provider
 * keys without leaving the copilot panel.
 *
 * The dashboard `SettingsPage` (which also hosts `BYOKKeysPanel`) is hidden in
 * playground mode, so this modal is the only key-config surface there. Keys
 * entered here are persisted locally by `BYOKKeysPanel` itself — IndexedDB
 * (`stemstudio-byok`), optionally AES-GCM encrypted behind a passphrase. They
 * never leave the machine.
 */

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
`;

const Dialog = styled.div`
    width: min(520px, calc(100vw - 48px));
    max-height: calc(100vh - 96px);
    overflow-y: auto;
    background: #1c1f26;
    border: 1px solid #2c323d;
    border-radius: 10px;
    padding: 20px;
`;

const CloseRow = styled.div`
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8px;
`;

const CloseButton = styled.button`
    background: transparent;
    border: 1px solid #3a414d;
    color: #c8d0dc;
    border-radius: 6px;
    padding: 4px 10px;
    cursor: pointer;

    &:hover {
        background: #2a2f38;
    }
`;

export const AiKeysModal = ({onClose}: {onClose: () => void}) => {
    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (e.target === e.currentTarget) onClose();
        },
        [onClose],
    );

    return (
        <Overlay onClick={handleOverlayClick}>
            <Dialog>
                <CloseRow>
                    <CloseButton type="button" onClick={onClose}>
                        Close
                    </CloseButton>
                </CloseRow>
                <BYOKKeysPanel />
            </Dialog>
        </Overlay>
    );
};
