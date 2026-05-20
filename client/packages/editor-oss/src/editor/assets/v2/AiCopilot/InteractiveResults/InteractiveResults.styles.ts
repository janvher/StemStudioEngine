import styled from "styled-components";

export const Container = styled.div`
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: rgba(30, 30, 40, 0.95);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
`;

export const Title = styled.div`
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
    margin-bottom: 4px;
`;

export const Description = styled.div`
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
`;

export const ItemsGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
    }
`;

export const ItemCard = styled.div<{$selected: boolean; $loading?: boolean}>`
    display: flex;
    flex-direction: column;
    background: rgba(40, 40, 50, 0.8);
    border-radius: 6px;
    border: 2px solid ${props => props.$selected ? "#4a9eff" : "rgba(255, 255, 255, 0.1)"};
    cursor: ${props => props.$loading ? "not-allowed" : "pointer"};
    transition: all 0.2s ease;
    overflow: hidden;
    position: relative;
    opacity: ${props => props.$loading ? 0.6 : 1};

    &:hover {
        border-color: ${props => props.$selected ? "#4a9eff" : "rgba(255, 255, 255, 0.3)"};
        transform: ${props => props.$loading ? "none" : "translateY(-2px)"};
    }
`;

export const LoadingOverlay = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
`;

export const Spinner = styled.div`
    width: 32px;
    height: 32px;
    border: 3px solid rgba(74, 158, 255, 0.2);
    border-top-color: #4a9eff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

export const Thumbnail = styled.div<{$url?: string}>`
    width: 100%;
    height: 120px;
    background: ${props =>
        props.$url
            ? `url(${props.$url}) center/cover`
            : "linear-gradient(135deg, rgba(74, 158, 255, 0.1), rgba(74, 158, 255, 0.05))"};
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
`;

export const ItemInfo = styled.div`
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

export const ItemName = styled.div`
    font-size: 12px;
    font-weight: 500;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ItemDescription = styled.div`
    font-size: 10px;
    color: rgba(255, 255, 255, 0.6);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
`;

export const MetadataTag = styled.span`
    display: inline-block;
    padding: 2px 6px;
    background: rgba(74, 158, 255, 0.2);
    border-radius: 3px;
    font-size: 9px;
    color: #4a9eff;
    margin-right: 4px;
    margin-top: 4px;
`;

export const ButtonContainer = styled.div`
    display: flex;
    gap: 8px;
    margin-top: 8px;
`;

export const Button = styled.button<{$variant?: "primary" | "secondary"}>`
    flex: 1;
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    background: ${props => props.$variant === "primary" ? "#4a9eff" : "rgba(255, 255, 255, 0.1)"};
    color: #ffffff;

    &:hover {
        background: ${props => props.$variant === "primary" ? "#3a8eef" : "rgba(255, 255, 255, 0.2)"};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

export const MinimizedContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(30, 30, 40, 0.95);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        border-color: rgba(74, 158, 255, 0.5);
        background: rgba(35, 35, 45, 0.95);
    }
`;

export const MinimizedTitle = styled.div`
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
`;

export const MinimizedInfo = styled.div`
    font-size: 11px;
    color: rgba(255, 255, 255, 0.6);
    margin-left: auto;
`;
