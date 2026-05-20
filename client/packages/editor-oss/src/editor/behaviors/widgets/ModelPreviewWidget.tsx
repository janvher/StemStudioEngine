import React, {useState, useEffect} from "react";
import styled from "styled-components";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {ContentItem} from "../../assets/v2/RightPanel/common/ContentItem";
import {PanelSectionTitleSecondary} from "../../assets/v2/RightPanel/RightPanel.style";
import {ModelPreviewAttribute} from "../BehaviorAttributes";

const PreviewContainer = styled.div<{size: number}>`
    width: ${props => props.size}px;
    height: ${props => props.size}px;
    border-radius: 4px;
    background-color: #2a2a2a;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid #3a3a3a;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 11px;
`;

const PlaceholderText = styled.span`
    text-align: center;
    padding: 4px;
`;

const ModelPreviewWidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => string;
    size: number;
}> = ({label, getCurrentValue, size}) => {
    const [imageUrl, setImageUrl] = useState(getCurrentValue() || "");

    useEffect(() => {
        setImageUrl(getCurrentValue() || "");
    }, [getCurrentValue]);

    const hasImage = !!imageUrl;

    return (
        <ContentItem>
            {label && <PanelSectionTitleSecondary>{label}</PanelSectionTitleSecondary>}
            <PreviewContainer
                size={size}
                style={hasImage ? {backgroundImage: `url(${imageUrl})`} : undefined}
            >
                {!hasImage && <PlaceholderText>No preview</PlaceholderText>}
            </PreviewContainer>
        </ContentItem>
    );
};

class ModelPreviewWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-model-preview";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: ModelPreviewAttribute,
        getCurrentValue: () => string,
    ): React.ReactElement {
        const size = attribute.size ?? 64;

        return (
            <ModelPreviewWidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                size={size}
            />
        );
    }
}

export default ModelPreviewWidget;
