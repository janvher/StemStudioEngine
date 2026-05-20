import React, {useState, useEffect} from "react";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {AssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {SelectRow} from "../../assets/v2/RightPanel/common/SelectRow";
import {PrefabAttribute} from "../BehaviorAttributes";

type PrefabOption = {
    key: string;
    value: string;
    assetRef: AssetRef | null;
};

const noneOption = {key: "none", value: "none", assetRef: null} as const;

const PrefabWidgetComponent: React.FC<{
    label: string;
    optionsPromise: Promise<{name: string; assetRef: AssetRef}[]>;
    getCurrentValue: () => AssetRef | null;
    updateBehaviorField: (assetRef: AssetRef | null) => void;
}> = ({label, optionsPromise, getCurrentValue, updateBehaviorField}) => {
    const [options, setOptions] = useState<PrefabOption[]>([noneOption]);
    const [current, setCurrent] = useState(getCurrentValue());

    // Wait for the options to load and repopulate the dropdown
    useEffect(() => {
        optionsPromise
            .then(newOptions => {
                const mapped = newOptions.map(option => ({
                    key: option.assetRef.assetId,
                    value: option.name,
                    assetRef: option.assetRef,
                }));
                setOptions([noneOption, ...mapped]);
            })
            .catch(error => {
                console.error("Failed to load prefab options for PrefabWidgetComponent", error);
                setOptions([noneOption]);
            });
    }, [optionsPromise]);

    useEffect(() => {
        setCurrent(getCurrentValue());
    }, [getCurrentValue]);

    const selectedOption = options.find(
        option => option.assetRef?.assetId === current?.assetId && option.assetRef?.revisionId === current?.revisionId,
    );

    const handleChange = (item: any) => {
        setCurrent(item.assetRef);
        updateBehaviorField(item.assetRef);
    };

    return (
        <SelectRow
            label={label}
            value={selectedOption}
            data={options}
            onChange={handleChange}
            $margin="0"
            width={!label ? "100%" : undefined}
        />
    );
};

class PrefabWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-prefab";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: PrefabAttribute,
        getCurrentValue: () => AssetRef | null,
        updateBehaviorField: (assetRef: AssetRef | null) => void,
    ): React.ReactElement {
        return (
            <PrefabWidgetComponent
                label={name}
                optionsPromise={attribute.optionsPromise}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
            />
        );
    }
}

export default PrefabWidget;
