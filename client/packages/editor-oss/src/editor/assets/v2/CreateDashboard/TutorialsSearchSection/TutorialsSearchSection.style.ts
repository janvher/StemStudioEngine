import styled from "styled-components";

export const Section = styled.section`
    flex: 0 1 360px;
    min-height: 48px;
    display: flex;
    align-items: center;

    @media only screen and (max-width: 900px) {
        width: 100%;
        flex-basis: 100%;
    }
`;

export const ResultsList = styled.div`
    width: 100%;
    display: flex;
    align-items: stretch;
    gap: 8px;

    @media only screen and (max-width: 520px) {
        flex-direction: column;
    }
`;

export const ResultItem = styled.a`
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    color: inherit;
    text-decoration: none;
    transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.12);
        transform: translateY(-1px);
    }
`;

export const KindIcon = styled.span`
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: rgba(249, 115, 22, 0.1);
    color: var(--theme-orange, #f97316);
    display: inline-flex;
    align-items: center;
    justify-content: center;

    svg {
        width: 16px;
        height: 16px;
    }
`;

export const ResultText = styled.div`
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

export const ResultTitle = styled.span`
    color: #ffffff;
    font-family: "Lexend", sans-serif;
    font-size: 12px;
    font-weight: 600;
    line-height: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ResultDescription = styled.span`
    color: #8b93a7;
    font-family: "Lexend", sans-serif;
    font-size: 12px;
    line-height: 14px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
`;

export const ExternalIcon = styled.span`
    flex-shrink: 0;
    color: #6b7080;
    align-self: center;

    svg {
        width: 14px;
        height: 14px;
    }
`;
