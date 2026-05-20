import styled from "styled-components";

import {flexCenter, regularFont} from "../../../../assets/style";

export const Backdrop = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(8, 9, 10, 0.72);
    backdrop-filter: blur(2px);
    z-index: 10000;
    ${flexCenter};
`;

export const ModalContainer = styled.div`
    background: linear-gradient(180deg, #222323 0%, #1c1d1f 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    padding: 28px;
    max-width: 980px;
    width: 94vw;
    color: #fff;
`;

export const ModalHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h2 {
        ${regularFont("s")};
        font-size: 34px;
        font-weight: 700;
        line-height: 1.1;
        margin: 0;
    }
`;

export const CloseButton = styled.button`
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    font-size: 22px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;

    &:hover {
        color: #fff;
    }
`;

export const BillingToggle = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #111214;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    padding: 4px;
    margin-bottom: 20px;
`;

export const ToggleOption = styled.button<{$active: boolean}>`
    ${regularFont("s")};
    border: none;
    border-radius: 999px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 13px;
    white-space: nowrap;
    background: ${({$active}) => ($active ? "#2e3135" : "transparent")};
    color: ${({$active}) => ($active ? "#fff" : "rgba(255,255,255,0.6)")};
    font-weight: ${({$active}) => ($active ? "600" : "500")};
`;

export const ProductsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px;

    @media (max-width: 900px) {
        grid-template-columns: 1fr;
    }
`;

export const ProductCard = styled.div`
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
`;

export const CardTop = styled.div`
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

export const ProductImage = styled.img`
    width: 42px;
    height: 42px;
    border-radius: 9px;
    object-fit: cover;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const ProductName = styled.div`
    ${regularFont("s")};
    font-size: 40px;
    font-weight: 700;
    line-height: 0.95;
`;

export const ProductSubtitle = styled.div`
    ${regularFont("s")};
    color: rgba(255, 255, 255, 0.64);
    font-size: 18px;
`;

export const PriceRow = styled.div`
    display: flex;
    align-items: baseline;
    gap: 10px;
`;

export const PriceAmount = styled.div`
    ${regularFont("s")};
    font-size: 52px;
    font-weight: 700;
    line-height: 1;
    display: flex;
    align-items: baseline;
    gap: 8px;
`;

export const PriceLabel = styled.div`
    ${regularFont("s")};
    color: rgba(255, 255, 255, 0.64);
    line-height: 1.2;
`;

export const StrikePrice = styled.s`
    color: rgba(255, 255, 255, 0.45);
    font-size: 34px;
    font-weight: 500;
`;

export const ActionButton = styled.button`
    width: 100%;
    height: 46px;
    border-radius: 10px;
    border: none;
    background: var(--theme-dialog-button-primary);
    color: #2f2f2f;
    cursor: pointer;
    ${regularFont("s")};
    font-size: 26px;
    font-weight: 600;

    &:hover {
        background: var(--theme-dialog-button-primary-hover);
    }
    &:active {
        background: var(--theme-dialog-button-primary-active);
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

export const CardBottom = styled.div`
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 18px 24px 22px;
`;

export const FeaturesTitle = styled.div`
    ${regularFont("s")};
    font-weight: 600;
    margin-bottom: 10px;
    color: rgba(255, 255, 255, 0.9);
`;

export const FeatureList = styled.ul`
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const FeatureItem = styled.li`
    ${regularFont("s")};
    color: rgba(255, 255, 255, 0.72);
    font-size: var(--theme-font-size-m);
    display: flex;
    gap: 8px;

    &::before {
        content: "✓";
        color: rgba(255, 255, 255, 0.7);
    }
`;

export const FooterNotice = styled.div`
    ${regularFont("s")};
    color: rgba(255, 255, 255, 0.45);
    text-align: center;
    padding: 14px 0 0;
    font-size: var(--theme-font-size-xs);
`;

export const ErrorText = styled.div`
    ${regularFont("s")};
    color: #f87171;
    text-align: center;
    padding: 0 0 12px;
`;
