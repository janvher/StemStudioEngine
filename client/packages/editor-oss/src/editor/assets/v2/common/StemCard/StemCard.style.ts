import styled from "styled-components";

import {flexCenter, safeTextByLines} from "../../../../../assets/style";

export const StyledCard = styled.div<{$selected?: boolean; $isHidden?: boolean}>`
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    flex-direction: column;
    position: relative;

    width: 108px;
    height: 164px;

    border-radius: 8px;
    border: ${({$selected, $isHidden}) =>
        $selected
            ? "2px solid var(--theme-container-active-blue-secondary)"
            : $isHidden
              ? "2px solid #b33"
              : "2px solid #497E35"};
    padding: 20px 8px 4px;
    background:
        linear-gradient(
            0deg,
            rgba(0, 0, 0, 0) 79.96%,
            rgba(0, 0, 0, 0.11) 83.88%,
            rgba(0, 0, 0, 0.38) 89.57%,
            rgba(0, 0, 0, 0.6) 100%
        ),
        linear-gradient(
            180deg,
            rgba(0, 0, 0, 0) 69.81%,
            rgba(0, 0, 0, 0.4) 73.56%,
            rgba(0, 0, 0, 0.75) 80.99%,
            #000 100%
        ),
        #353952;

    .thumbnail {
        height: 55px;
        aspect-ratio: 1/1;
        margin: 0 auto;
        border-radius: 4px;
    }
    .assetIcon {
        max-height: 60px;
        max-width: 40%;
        margin: 0 auto;
    }
`;
export const AssetName = styled.div`
    width: 100%;
    flex-shrink: 0;
    ${flexCenter};
    color: #fff;
    font-size: var(--theme-font-size-s);
    font-weight: 700;
    text-align: left;
    .text {
        ${safeTextByLines(2)};
        width: 100%;
    }
`;

export const Bottom = styled.div`
    width: 100%;
    height: 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
    gap: 4px;
    padding: 4px 0;
`;

export const DefaultImageWrapper = styled.div`
    position: relative;
    width: 100%;
    flex-grow: 1;
    ${flexCenter};
    svg,
    .stemThumbnail {
        width: 100%;
        aspect-ratio: 1/1;
        margin: 0 auto;
    }
    .stemThumbnail {
        width: 75%;
    }

    .placeholderImage {
        filter: brightness(1.5);
        width: 63%;
    }
`;
