import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../../../assets/style";

export const ContentItem = styled.div`
    ${flexCenter};
    flex-direction: column;
    align-items: flex-start;
    row-gap: 12px;
    padding: 12px 0;
    width: 100%;
    position: relative;
    span {
        ${regularFont("s")};
    }

    .uploadButton {
        border-radius: 8px;
        background-color: var(--theme-editor-box-bg);
        font-size: var(--theme-font-size-s);

        .closeIconWrapper {
            width: 22px;
            height: 22px;
            top: 0;
            right: 0;
            background-color: #0303039c;
            border-radius: 50%;
            img {
                width: 8px;
                height: 10px;
            }
        }
    }
`;
