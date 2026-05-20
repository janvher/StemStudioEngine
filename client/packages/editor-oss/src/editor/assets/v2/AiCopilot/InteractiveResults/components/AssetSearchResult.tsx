import React, {useState} from "react";

import {
    InteractiveResult,
    InteractiveResultItem,
    InteractiveSelectionEvent,
} from "@stem/editor-oss/agent/types/ACPTypes";
import {
    Button,
    ButtonContainer,
    Container,
    Description,
    ItemCard,
    ItemDescription,
    ItemInfo,
    ItemName,
    ItemsGrid,
    LoadingOverlay,
    MetadataTag,
    MinimizedContainer,
    MinimizedInfo,
    MinimizedTitle,
    Spinner,
    Thumbnail,
    Title,
} from "../InteractiveResults.styles";

interface AssetSearchResultProps {
    result: InteractiveResult;
    onSelect: (selection: InteractiveSelectionEvent, handleLoad?: (isLoading: boolean, itemId: string) => void) => void;
    onCancel: () => void;
    isPending?: boolean;
}

export const AssetSearchResult: React.FC<AssetSearchResultProps> = ({result, onSelect, onCancel, isPending}) => {
    const [selectedItems, setSelectedItems] = useState<InteractiveResultItem[]>([]);
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
    const [isMinimized, setIsMinimized] = useState(false);

    const handleItemClick = (item: InteractiveResultItem) => {
        setSelectedItems(prev => {
            const isSelected = prev.some(i => i.id === item.id);
            if (isSelected) {
                return prev.filter(i => i.id !== item.id);
            } else {
                return [...prev, item];
            }
        });
    };

    const handleConfirm = () => {
        if (selectedItems.length > 0) {
            const selection: InteractiveSelectionEvent = {
                interactiveId: result.id,
                selectedItems: selectedItems,
                action: "confirm",
            };
            onSelect(selection, handleLoad);
            setSelectedItems([]);
        }
    };

    const handleCancel = () => {
        const selection: InteractiveSelectionEvent = {
            interactiveId: result.id,
            selectedItems: [],
            action: "cancel",
        };
        onCancel();
        if (isPending) {
            onSelect(selection);
        }
    };

    const handleLoad = (isLoading: boolean, itemId: string) => {
        setLoadingItems(prev => ({...prev, [itemId]: isLoading}));
    };

    const handleClose = () => {
        setIsMinimized(true);
    };

    const handleReopen = () => {
        setIsMinimized(false);
    };

    if (isMinimized) {
        return (
            <MinimizedContainer onClick={handleReopen}>
                <MinimizedTitle>{result.title}</MinimizedTitle>
                <MinimizedInfo>{result.items.length} item(s) • Click to expand</MinimizedInfo>
            </MinimizedContainer>
        );
    }

    return (
        <Container>
            <Title>{result.title}</Title>
            {result.description && <Description>{result.description}</Description>}
            {isPending && selectedItems.length > 0 && 
                <Description style={{color: "#4a9eff"}}>{selectedItems.length} item(s) selected</Description>
            }

            <ItemsGrid>
                {result.items.map(item => {
                    const isLoading = loadingItems[item.id];
                    const isSelected = selectedItems.some(i => i.id === item.id);
                    return (
                        <ItemCard
                            key={item.id}
                            $selected={isSelected}
                            $loading={isLoading}
                            onClick={() => !isLoading && handleItemClick(item)}
                        >
                            {isLoading && 
                                <LoadingOverlay>
                                    <Spinner />
                                </LoadingOverlay>
                            }
                            <Thumbnail $url={item.thumbnailUrl || item.previewUrl}>
                                {!item.thumbnailUrl && !item.previewUrl && "No Preview"}
                            </Thumbnail>
                            <ItemInfo>
                                <ItemName title={item.name}>{item.name}</ItemName>
                                {item.description && <ItemDescription>{item.description}</ItemDescription>}
                                {item.metadata && 
                                    <div>
                                        {item.metadata.provider && <MetadataTag>{item.metadata.provider}</MetadataTag>}
                                        {item.metadata.assetType && 
                                            <MetadataTag>{item.metadata.assetType}</MetadataTag>
                                        }
                                        {item.metadata.category && <MetadataTag>{item.metadata.category}</MetadataTag>}
                                    </div>
                                }
                            </ItemInfo>
                        </ItemCard>
                    );
                })}
            </ItemsGrid>

            {result.items.length === 0 && 
                <Description style={{textAlign: "center", padding: "20px"}}>No results found</Description>
            }

            <ButtonContainer>
                {isPending ? 
                    <Button $variant="secondary"
                        onClick={handleCancel}
                    >
                        Cancel
                    </Button>
                 : 
                    <Button $variant="secondary"
                        onClick={handleClose}
                    >
                        Close
                    </Button>
                }

                <Button $variant="primary"
                    onClick={handleConfirm}
                    disabled={selectedItems.length === 0}
                >
                    Add {selectedItems.length > 0 ? `${selectedItems.length}` : ""} to Scene
                </Button>
            </ButtonContainer>
        </Container>
    );
};
