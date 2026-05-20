import {type RefObject, useEffect, useRef, useState} from "react";
import {
    EmailIcon,
    EmailShareButton,
    FacebookIcon,
    FacebookShareButton,
    RedditIcon,
    RedditShareButton,
    TelegramIcon,
    TelegramShareButton,
    TwitterShareButton,
    WhatsappIcon,
    WhatsappShareButton,
    XIcon,
} from "react-share";
import styled from "styled-components";
import {useOnClickOutside} from "usehooks-ts";

import {useEscapeDismiss} from "./hooks/useEscapeDismiss";
import {StyledButton} from "./StyledButton";
import {flexCenter, regularFont} from "../../../../assets/style";
import {useAuthorizationContext} from "@stem/editor-oss/context";
import closeIcon from "../icons/close-panel.svg";

const Container = styled.div`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    width: 500px;
    height: 400px;

    background: var(--theme-dialog-bg);
    border: none;
    border-radius: var(--theme-dialog-border-radius);
    box-shadow: var(--theme-dialog-shadow);
    color: var(--theme-font-main-selected-color);

    ${flexCenter};
    flex-direction: column;
    justify-content: flex-start;
    row-gap: 20px;

    .title {
        width: 100%;
        height: 40px;
        background: var(--theme-dialog-bg);
        border-top-left-radius: var(--theme-dialog-border-radius);
        border-top-right-radius: var(--theme-dialog-border-radius);
        ${regularFont("s")};
        text-align: center;
        padding: 16px 32px 32px;
    }

    .shareBtn {
        background: var(--theme-homepage-button-primary);
        border-radius: var(--theme-dialog-border-radius);
        margin-bottom: 32px;
        box-sizing: border-box;
        span,
        &:before {
            background: transparent;
        }
    }
`;

const CloseBtn = styled.button`
    position: absolute;
    right: 16px;
    top: 16px;

    img {
        width: 13px;
        height: auto;
    }
`;

const Wrapper = styled.div`
    height: 100%;
    width: 100%;
    padding: 16px 32px 16px;
    border-radius: 24px;
    box-sizing: border-box;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 48px;
`;

const UrlWrapper = styled.div`
    background: rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    width: 90%;
    height: 48px;
    position: relative;
    ${flexCenter};

    .textWrapper {
        width: 100%;
        padding: 0 8px;
        color: white;
        font-size: 16px;
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
    }
    .copyBtn {
        height: 100%;
        width: 96px;
        border-top-right-radius: 24px;
        border-bottom-right-radius: 24px;
        background: var(--theme-homepage-button-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        cursor: pointer;
        filter: brightness(1);
        font-weight: var(--theme-font-medium-plus);
        transition: filter 0.3s ease;
        &:active {
            filter: brightness(1.2);
        }
    }

    .copiedMessage {
        position: absolute;
        bottom: calc(100% + 16px);
        left: 50%;
        transform: translateX(-50%);
        opacity: 0;
        background: rgba(255, 255, 255, 0.1);
        &.visible {
        }
    }
`;

const CopyMessage = styled.div<{$visible?: boolean}>`
    box-sizing: border-box;
    position: absolute;
    top: -8px;
    transform: translate(-50%, -100%);
    left: 50%;
    opacity: 0;
    pointer-events: none;
    background: rgba(255, 255, 255, 0.1);
    transition: opacity 0.3s ease;
    padding: 8px 16px;
    border-radius: 16px;
    ${({$visible}) => $visible && `opacity: 1;`}
`;

const ShareButtonsWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
`;

type Props = {
    onClose: () => void;
    url: string;
    title?: string;
};

export const ShareModal = ({onClose, url, title}: Props) => {
    const {dbUser} = useAuthorizationContext();
    const ref = useRef<HTMLDivElement>(null);
    const [isCopied, setIsCopied] = useState(false);

    useOnClickOutside(ref as unknown as RefObject<HTMLDivElement>, onClose);
    useEscapeDismiss({onEscape: onClose});

    const emailMessage = dbUser
        ? `Check out this game ${dbUser.username} made with Stem Studio!`
        : `Check out this game that your friend made with Stem Studio!`;

    useEffect(() => {
        if (isCopied) {
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        }
    }, [isCopied]);

    return (
        <Container ref={ref}>
            <div className="title">
                Share
                <CloseBtn className="reset-css"
                    onClick={onClose}
                >
                    <img src={closeIcon}
                        alt="close"
                    />
                </CloseBtn>
            </div>
            <Wrapper>
                <ShareButtonsWrapper>
                    <TwitterShareButton url={url}
                        title={title}
                    >
                        <XIcon size={48}
                            round
                        />
                    </TwitterShareButton>
                    <FacebookShareButton url={url}
                        hashtag={"#stemstudio"}
                    >
                        <FacebookIcon size={48}
                            round
                        />
                    </FacebookShareButton>
                    <TelegramShareButton url={url}
                        title={title}
                    >
                        <TelegramIcon size={48}
                            round
                        />
                    </TelegramShareButton>
                    <WhatsappShareButton url={url}
                        title={title}
                    >
                        <WhatsappIcon size={48}
                            round
                        />
                    </WhatsappShareButton>
                    <RedditShareButton url={url}
                        title={title}
                    >
                        <RedditIcon size={48}
                            round
                        />
                    </RedditShareButton>
                    <EmailShareButton url={url}
                        subject={`Play ${title}!`}
                        body={emailMessage}
                    >
                        <EmailIcon size={48}
                            round
                        />
                    </EmailShareButton>
                </ShareButtonsWrapper>
                <UrlWrapper>
                    <CopyMessage $visible={isCopied}>Copied!</CopyMessage>
                    <div className="textWrapper">{url}</div>
                    <div
                        className="copyBtn"
                        onClick={() => {
                            navigator.clipboard.writeText(url);
                            setIsCopied(true);
                        }}
                    >
                        Copy
                    </div>
                </UrlWrapper>
            </Wrapper>
            <StyledButton isBlue
                style={{width: "120px", height: "48px"}}
                onClick={onClose}
                className="shareBtn"
            >
                Close
            </StyledButton>
        </Container>
    );
};
