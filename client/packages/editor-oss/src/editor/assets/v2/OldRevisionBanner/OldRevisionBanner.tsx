import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";
import {useAppGlobalContext} from "@stem/editor-oss/context";
import {EDITOR_TOP_NAV_HEIGHT} from "@stem/editor-oss/types/editor";
import warningIcon from "../icons/warning.svg";
import closeIcon from "../icons/x-mark.svg";

const Container = styled.div`
    position: absolute;
    top: calc(${EDITOR_TOP_NAV_HEIGHT} + 4px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: auto;
    height: 32px;
    padding: 8px 12px 8px 8px;
    ${flexCenter};
    ${regularFont("s")};
    column-gap: 4px;
    border-radius: 8px;
    border: 1px solid var(--theme-warning, #f5a623);
    background: var(--theme-container-main-dark);
    z-index: 1;
`;

const CloseButton = styled.button`
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    opacity: 0.7;
    &:hover {
        opacity: 1;
    }
`;

export const OldRevisionBanner = () => {
    const {isEditingOldRevision, setIsEditingOldRevision} = useAppGlobalContext();

    if (!isEditingOldRevision) return null;

    return (
        <Container>
            <img src={warningIcon} alt="warning" />
            You are editing an older revision
            <CloseButton onClick={() => setIsEditingOldRevision(false)} aria-label="Dismiss">
                <img src={closeIcon} alt="close" width={10} height={10} />
            </CloseButton>
        </Container>
    );
};
