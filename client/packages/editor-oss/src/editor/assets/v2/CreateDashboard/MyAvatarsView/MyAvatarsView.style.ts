import styled from "styled-components";

export const PageContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 24px 0;
    width: 100%;
`;

export const PageHeading = styled.h1`
    font-size: 28px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--theme-font-primary);
    margin: 0;
`;

export const PageSubtitle = styled.p`
    font-size: 14px;
    color: var(--theme-font-secondary);
    margin: 0;
    max-width: 640px;
`;

export const Grid = styled.div`
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-gap: 20px;
    width: 100%;
    max-width: 720px;
`;

export const Card = styled.div<{$active?: boolean}>`
    position: relative;
    aspect-ratio: 1 / 1;
    background: var(--theme-card-bg);
    border-radius: 20px;
    border: 2px solid ${({$active}) => ($active ? "#C8D144" : "transparent")};
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease;

    &:hover {
        transform: scale(1.02);
    }
`;

export const Thumb = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
`;

export const DefaultBadge = styled.div`
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 2px 8px;
    background: #c8d144;
    color: #141729;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
`;

export const NameLabel = styled.div`
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ActionRow = styled.div`
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    opacity: 0;
    transition: opacity 0.15s ease;

    ${Card}:hover & {
        opacity: 1;
    }
`;

export const ActionButton = styled.button`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: rgba(20, 23, 41, 0.85);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.15s ease;

    &:hover:not(:disabled) {
        background: rgba(40, 45, 70, 1);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

export const AddCard = styled.button`
    aspect-ratio: 1 / 1;
    background: var(--theme-card-bg);
    border: 2px dashed rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    color: var(--theme-font-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease;
    font-size: 14px;
    font-weight: 500;
    text-align: center;
    padding: 0 12px;

    &:hover:not(:disabled) {
        border-color: #c8d144;
        color: #fff;
        transform: scale(1.02);
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
    }

    svg {
        width: 28px;
        height: 28px;
    }
`;

export const EmptyState = styled.div`
    grid-column: 1 / -1;
    text-align: center;
    padding: 48px 0;
    color: var(--theme-font-secondary);
    font-size: 14px;
`;
