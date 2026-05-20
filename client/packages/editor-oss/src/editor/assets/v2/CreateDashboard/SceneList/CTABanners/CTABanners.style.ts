import styled from "styled-components";

export const BannersGrid = styled.div`
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    @media only screen and (max-width: 1280px) {
        grid-template-columns: 1fr;
    }
`;

export const BannerCard = styled.div<{$bgImage?: string}>`
    position: relative;
    width: 100%;
    aspect-ratio: 21 / 9;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;

    ${({$bgImage}) =>
        $bgImage &&
        `
        background-image: url('${$bgImage}');
        background-repeat: no-repeat;
        background-size: cover;
        background-position: center;
    `}

    &:not(:disabled):hover {
        transform: translateY(-1px);
    }
`;

export const BannerOverlay = styled.div`
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 100%);
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 16px 20px;
    gap: 4px;

    @media only screen and (max-width: 480px) {
        padding: 12px 16px;
    }
`;

export const BannerTag = styled.span`
    font-size: 12px;
    font-weight: 600;
    color: #c8d144;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-family: "Lexend", sans-serif;
`;

export const BannerTitle = styled.h3`
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    color: #e9e9e9;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: "Innovator Grotesk VF", "Lexend", sans-serif;

    @media only screen and (max-width: 480px) {
        font-size: 16px;
    }
`;

export const BannerStat = styled.span`
    font-size: 14px;
    color: #b2b2b9;
    font-family: "Lexend", sans-serif;
`;
