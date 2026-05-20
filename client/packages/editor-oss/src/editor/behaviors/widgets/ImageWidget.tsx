import React, {useState, useEffect} from "react";
import ReactDOM from "react-dom/client";
import styled from "styled-components";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {UploadField} from "../../assets/v2/common/UploadField/UploadField";
import {ContentItem} from "../../assets/v2/RightPanel/common/ContentItem";
import {SelectRow} from "../../assets/v2/RightPanel/common/SelectRow";
import {PanelSectionTitleSecondary} from "../../assets/v2/RightPanel/RightPanel.style";
import {ImageAttribute} from "../BehaviorAttributes";

const ImageWidgetComponent: React.FC<{
    label: string;
    getCurrentValue: () => string;
    updateBehaviorField: (value: string) => void;
}> = ({label, getCurrentValue, updateBehaviorField}) => {
    const [selectedValue, setSelectedValue] = useState(getCurrentValue() || "");

    useEffect(() => {
        setSelectedValue(getCurrentValue() || "");
    }, [getCurrentValue]);

    const handleUploadImage = (imageUrl: any) => {
        updateBehaviorField(imageUrl);
        setSelectedValue(imageUrl);
    };

    return (
        <ContentItem>
            <PanelSectionTitleSecondary>{label}</PanelSectionTitleSecondary>
            <UploadField
                width="80px"
                height="80px"
                accept="image/png, image/jpeg, image/gif, image/webp, .ktx2"
                uploadedFile={getCurrentValue()}
                setUploadedFile={imageUrl => handleUploadImage(imageUrl)}
            />
        </ContentItem>
    );
};

class ImageWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-image";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: ImageAttribute,
        getCurrentValue: () => string,
        updateBehaviorField: (value: string) => void,
    ): React.ReactElement {
        return (
            <ImageWidgetComponent
                label={name}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
            />
        );
    }
}

export default ImageWidget;
