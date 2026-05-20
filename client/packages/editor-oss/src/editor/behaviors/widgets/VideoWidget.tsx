import React, { useState, useEffect } from "react";

import BaseAttributeWidget from "./BaseAttributeWidget";
import { SelectRow } from "../../assets/v2/RightPanel/common/SelectRow";
import { VideoAttribute } from "../BehaviorAttributes";

interface VideoOption {
    label: string;
    value: any;
}

const VideoWidgetComponent: React.FC<{
    label: string;
    options: VideoOption[];
    getCurrentValue: () => any;
    updateBehaviorField: (value: any) => void;
}> = ({ label, options, getCurrentValue, updateBehaviorField }) => {
    const [current, setCurrent] = useState(getCurrentValue());

    useEffect(() => {
        setCurrent(getCurrentValue());
    }, [getCurrentValue]);

    const items = options.map(option => ({
        key: option.value.toString(),
        value: option.label,
        realValue: option.value,
    }));

    const selectedItem = items.find(item => item.realValue === current);

    const handleChange = (item: any) => {
        setCurrent(item.realValue);
        updateBehaviorField(item.realValue);
    };

    return (
        <SelectRow
            label={label}
            value={selectedItem}
            data={items}
            onChange={handleChange}
            $margin="16px 0"
            width="140px"
        />
    );
};

class VideoWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-video";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: VideoAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
    ): React.ReactElement {
        return (
            <VideoWidgetComponent
                label={name}
                options={attribute.options || []}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
            />
        );
    }
}

export default VideoWidget;
