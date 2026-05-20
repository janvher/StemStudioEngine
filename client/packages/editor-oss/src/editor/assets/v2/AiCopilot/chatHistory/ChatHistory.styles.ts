import styled from "styled-components";

export const Container = styled.div<{$isOpen: boolean}>`
    display: ${props => props.$isOpen ? "flex" : "none"};
    flex-direction: column;
    background: rgba(20, 20, 30, 0.95);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    margin-bottom: 8px;
    max-height: 300px;
    overflow: hidden;
`;

export const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

export const Title = styled.h3`
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.9;
`;

export const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
    font-size: 18px;
    line-height: 1;

    &:hover {
        color: #ffffff;
    }
`;

export const HistoryList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
`;

export const HistoryItem = styled.div`
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(74, 158, 255, 0.4);
        transform: translateX(2px);
    }

    &:last-child {
        margin-bottom: 0;
    }
`;

export const HistoryItemTitle = styled.div`
    font-size: 12px;
    font-weight: 500;
    color: #ffffff;
    margin-bottom: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
`;

export const HistoryItemMeta = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
`;

export const HistoryItemDate = styled.span``;

export const HistoryItemMessages = styled.span`
    &::before {
        content: "•";
        margin-right: 4px;
    }
`;

export const HistoryItemCredits = styled.span`
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 3px;
    color: rgba(255, 255, 255, 0.8);
    &::before {
        content: "⚡";
        font-size: 9px;
    }
`;

export const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.3);
`;

export const EmptyStateIcon = styled.div`
    font-size: 32px;
    margin-bottom: 8px;
    opacity: 0.3;
`;

export const EmptyStateText = styled.div`
    font-size: 12px;
    font-weight: 500;
`;

export const LoadingContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
`;

export const LoadingSpinner = styled.div`
    width: 24px;
    height: 24px;
    border: 2px solid rgba(74, 158, 255, 0.2);
    border-top-color: #4a9eff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

export const ErrorContainer = styled.div`
    padding: 16px;
    text-align: center;
    color: #ff6b6b;
    font-size: 11px;
`;
