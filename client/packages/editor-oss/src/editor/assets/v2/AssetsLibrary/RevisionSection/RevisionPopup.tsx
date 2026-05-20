import styled from "styled-components";

import { RevisionListProps } from './RevisionList';
import { RevisionSection } from "./RevisionSection";
import { flexCenter, regularFont } from "../../../../../assets/style";
import {useEscapeDismiss} from "../../common/hooks/useEscapeDismiss";
import xIcon from "../../icons/close-panel.svg";

export type RevisionPopupProps = RevisionListProps & {
    onClose: () => void;
};

export const RevisionPopup = ({
    onClose,
    ...restProps
}: RevisionPopupProps) => {
    useEscapeDismiss({onEscape: onClose});

    return (
        <Popup>
            <Wrapper>
                <Header>
                    Revisions
                    <CloseButton
                        className="reset-css"
                        onClick={onClose}
                    >
                        <img
                            src={xIcon}
                            alt="close"
                        />
                    </CloseButton>
                </Header>
                <RevisionSection {...restProps} collapsible={false} />
            </Wrapper>
        </Popup>
    );
};

// cannot use transform for this popup as it breaks positioning off the TextDiffModal
// calculate position instead
const height = 618;
const width = 364;
const top = `calc(50vh - ${height / 2}px)`;
const left = `calc(50vw - ${width / 2}px)`;

const Popup = styled.div`
    position: fixed;
    width: ${width}px;
    height: ${height}px;
    top: ${top};
    left: ${left};
    z-index: 1000;
    overflow: hidden;

    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    color: var(--theme-font-main-selected-color);

    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 0px;
`;

const Wrapper = styled.div`
    padding: 0 0 12px 8px;
    width: 100%;
    overflow: auto;
`;

const Header = styled.div`
    width: 100%;
    ${regularFont("xs")}
    font-weight: 500;
    text-align: center;
    padding: 16px 0;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--theme-grey-bg);

    position: relative;
`;

const CloseButton = styled.button`
    position: absolute;
    top: 50%;
    right: 8px;
    transform: translateY(-50%);

    img {
        width: 13px;
        height: auto;
    }
`;
