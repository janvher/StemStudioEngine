import React, {useState} from "react";
import * as THREE from "three";

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

interface TextureSearchResultProps {
    result: InteractiveResult;
    onSelect: (selection: InteractiveSelectionEvent, handleLoad?: (isLoading: boolean, itemId: string) => void) => void;
    onCancel: () => void;
    isPending?: boolean;
    selectedObjects?: THREE.Object3D[];
}

export const TextureSearchResult: React.FC<TextureSearchResultProps> = ({
    result,
    onSelect,
    onCancel,
    isPending,
    selectedObjects,
}) => {
    const [selectedItems, setSelectedItems] = useState<InteractiveResultItem[]>([]);
    const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
    const [isMinimized, setIsMinimized] = useState(false);

    // Validation: Check if user has selected objects
    const hasSelectedObjects = selectedObjects && selectedObjects.length > 0;
    const validationError = !hasSelectedObjects
        ? "Please select one or more objects in the scene to apply texture"
        : null;

    const handleItemClick = (item: InteractiveResultItem) => {
        if (!hasSelectedObjects) {
            return; // Don't allow selection if no objects selected
        }

        setSelectedItems(prev => {
            const isSelected = prev.some(i => i.id === item.id);
            if (isSelected) {
                return []; // Unselect
            } else {
                return [item]; // Replace with single selection
            }
        });
    };

    const handleConfirm = () => {
        if (selectedItems.length > 0 && hasSelectedObjects) {
            const selection: InteractiveSelectionEvent = {
                interactiveId: result.id,
                selectedItems: selectedItems,
                selectedObjects: selectedObjects,
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

            {validationError && 
                <Description
                    style={{
                        color: "#ff6b6b",
                        fontWeight: "bold",
                        padding: "10px",
                        backgroundColor: "rgba(255, 107, 107, 0.1)",
                        borderRadius: "4px",
                    }}
                >
                    ⚠️ {validationError}
                </Description>
            }

            {hasSelectedObjects && 
                <Description style={{color: "#4a9eff"}}>
                    {selectedObjects.length} object(s) selected on scene
                    {selectedItems.length > 0 && ` • 1 texture selected`}
                </Description>
            }

            <ItemsGrid>
                {result.items.map(item => {
                    const isLoading = loadingItems[item.id];
                    const isSelected = selectedItems.some(i => i.id === item.id);
                    const isDisabled = !hasSelectedObjects;

                    return (
                        <ItemCard
                            key={item.id}
                            $selected={isSelected}
                            $loading={isLoading}
                            style={{opacity: isDisabled ? 0.5 : 1, cursor: isDisabled ? "not-allowed" : "pointer"}}
                            onClick={() => !isLoading && !isDisabled && handleItemClick(item)}
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

                <Button
                    $variant="primary"
                    onClick={handleConfirm}
                    disabled={selectedItems.length === 0 || !hasSelectedObjects}
                    title={!hasSelectedObjects ? "Please select objects on the scene first" : ""}
                >
                    Apply Texture
                </Button>
            </ButtonContainer>
        </Container>
    );
};
