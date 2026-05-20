import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../../assets/style";
import {EDITOR_TOP_NAV_HEIGHT} from "@stem/editor-oss/types/editor";

export const PublishPanelContainer = styled.div`
    width: 240px;
    height: auto;
    border-radius: 16px;
    background-color: var(--theme-container-main-dark);
    position: fixed;
    top: calc(${EDITOR_TOP_NAV_HEIGHT} + 8px);
    right: 8px;
    padding: 8px;
    border: 1px solid #ffffff1a;
    /* Portaled to body so this layer is not trapped by TopNav's z-index. */
    z-index: 10000;
`;

export const MainHeading = styled.div`
    ${flexCenter};
    justify-content: space-between;
    .label {
        ${regularFont("s")};
        font-weight: var(--theme-font-bold);
    }
`;

export const PostPublishHeading = styled.div`
    ${flexCenter};
    justify-content: flex-start;
    column-gap: 4px;

    img {
        width: 16px;
        height: 16px;
    }
`;

export const Heading = styled.div`
    ${flexCenter};
    justify-content: space-between;
    .label {
        ${regularFont("s")};
        font-weight: var(--theme-font-medium);
    }
`;

export const Description = styled.div`
    font-size: var(--theme-font-size-extra-small);
    color: var(--theme-font-unselected-color);
    line-height: 16px;
    font-weight: var(--theme-font-regular);
    margin-top: 8px;
`;

export const CopyURLContainer = styled.div`
    ${flexCenter};
    column-gap: 4px;
    margin-top: 12px;
    .url {
        width: 188px;
        height: 32px;
        padding: 8px;
        border-radius: 8px;
        background-color: var(--theme-grey-bg);

        ${regularFont("s")};
        white-space: nowrap;
        color: var(--theme-font-unselected-secondary-color);
    }
    img {
        width: 16px;
        height: 16px;
    }
`;
