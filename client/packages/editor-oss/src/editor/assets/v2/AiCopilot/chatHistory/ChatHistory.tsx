import React, {useEffect, useState, useRef, useCallback} from "react";

import {
    Container,
    Header,
    Title,
    CloseButton,
    HistoryList,
    HistoryItem,
    HistoryItemTitle,
    HistoryItemMeta,
    HistoryItemDate,
    HistoryItemMessages,
    HistoryItemCredits,
    EmptyState,
    EmptyStateIcon,
    EmptyStateText,
    LoadingContainer,
    LoadingSpinner,
    ErrorContainer,
} from "./ChatHistory.styles";
import {getCopilotHistoryList, CopilotHistoryListData} from "@stem/network/api/copilotHistory";

type Props = {
    isOpen: boolean;
    sceneID: string;
    onClose: () => void;
    onSelectHistory: (historyId: string, sessionId: string) => void;
};

export const ChatHistory: React.FC<Props> = ({isOpen, sceneID, onClose, onSelectHistory}) => {
    const [historyList, setHistoryList] = useState<CopilotHistoryListData[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset state when opening
            setHistoryList([]);
            setPage(1);
            setHasMore(true);
            setError(null);
            void loadHistory(1, true);
        }
    }, [isOpen]);

    const loadHistory = async (pageNum: number, reset: boolean = false) => {
        if (reset) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);
        try {
            const response = await getCopilotHistoryList(sceneID, pageNum, 20);

            if (reset) {
                setHistoryList(response.items);
            } else {
                setHistoryList(prev => [...prev, ...response.items]);
            }

            setHasMore(response.hasMore);
            setPage(pageNum);
        } catch (err: any) {
            console.error("Failed to load chat history:", err);
            setError(err.message || "Failed to load chat history");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const loadMoreHistory = useCallback(() => {
        if (!loadingMore && hasMore) {
            void loadHistory(page + 1, false);
        }
    }, [page, hasMore, loadingMore]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
                    loadMoreHistory();
                }
            },
            {threshold: 0.1},
        );

        const currentTarget = observerTarget.current;
        if (currentTarget) {
            observer.observe(currentTarget);
        }

        return () => {
            if (currentTarget) {
                observer.unobserve(currentTarget);
            }
        };
    }, [hasMore, loadingMore, loadMoreHistory]);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString();
    };

    const handleItemClick = (item: CopilotHistoryListData) => {
        onSelectHistory(item.ID, item.SessionID);
        onClose();
    };

    return (
        <Container $isOpen={isOpen}>
            <Header>
                <Title>Chat History</Title>
                <CloseButton onClick={onClose}>×</CloseButton>
            </Header>

            {loading ? 
                <LoadingContainer>
                    <LoadingSpinner />
                </LoadingContainer>
             : error ? 
                <ErrorContainer>{error}</ErrorContainer>
             : historyList.length === 0 ? 
                <EmptyState>
                    <EmptyStateIcon>💬</EmptyStateIcon>
                    <EmptyStateText>No chat history for this project yet</EmptyStateText>
                </EmptyState>
             : 
                <HistoryList>
                    {historyList.map(item => 
                        <HistoryItem key={item.ID}
                            onClick={() => handleItemClick(item)}
                        >
                            <HistoryItemTitle>{item.Title || "Untitled Conversation"}</HistoryItemTitle>
                            <HistoryItemMeta>
                                <HistoryItemDate>{formatDate(item.UpdateTime)}</HistoryItemDate>
                                <HistoryItemMessages>Session: {item.SessionID.substring(0, 8)}</HistoryItemMessages>
                                {item.UsedCredits > 0 && 
                                    <HistoryItemCredits>{item.UsedCredits} credits used</HistoryItemCredits>
                                }
                            </HistoryItemMeta>
                        </HistoryItem>,
                    )}
                    {loadingMore && 
                        <LoadingContainer style={{padding: "16px"}}>
                            <LoadingSpinner />
                        </LoadingContainer>
                    }
                    {hasMore && <div ref={observerTarget}
                        style={{height: "10px"}}
                                />}
                </HistoryList>
            }
        </Container>
    );
};
