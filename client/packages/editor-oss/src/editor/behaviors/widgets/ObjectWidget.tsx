import React, {useState, useEffect, useMemo, useCallback} from "react";

import BaseAttributeWidget from "./BaseAttributeWidget";
import {SelectRow} from "../../assets/v2/RightPanel/common/SelectRow";
import {ObjectAttribute} from "../BehaviorAttributes";

interface ObjectOption {
    key: string;
    value: string;
    uuid: string;
}

const ObjectWidgetComponent: React.FC<{
    label: string;
    options: {name: string; uuid: string}[];
    getCurrentValue: () => string;
    updateBehaviorField: (uuid: string) => void;
}> = ({label, options, getCurrentValue, updateBehaviorField}) => {
    const [current, setCurrent] = useState(getCurrentValue());

    useEffect(() => {
        setCurrent(getCurrentValue());
    }, [getCurrentValue]);

    const objectOptions = useMemo(() => {
        const dedupedByUuid = new Map<string, ObjectOption>();
        for (const option of options) {
            if (!dedupedByUuid.has(option.uuid)) {
                dedupedByUuid.set(option.uuid, {
                    key: option.uuid || "none",
                    value: option.name,
                    uuid: option.uuid,
                });
            }
        }

        if (!dedupedByUuid.has("")) {
            dedupedByUuid.set("", {key: "none", value: "none", uuid: ""});
        }

        return Array.from(dedupedByUuid.values()).sort((a, b) => {
            if (a.uuid === "") return -1;
            if (b.uuid === "") return 1;
            return a.value.localeCompare(b.value);
        });
    }, [options]);

    const selectedItem = useMemo(() => objectOptions.find(item => item.uuid === current), [objectOptions, current]);

    const handleChange = useCallback(
        (item: any) => {
            setCurrent(item.uuid);
            updateBehaviorField(item.uuid);
        },
        [updateBehaviorField],
    );

    return (
        <SelectRow
            label={label}
            value={selectedItem}
            data={objectOptions}
            onChange={handleChange}
            $margin="0"
            width={!label ? "100%" : undefined}
        />
    );
};

class ObjectWidget extends BaseAttributeWidget {
    protected getContainerPrefix(): string {
        return "widget-object";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: ObjectAttribute,
        getCurrentValue: () => string,
        updateBehaviorField: (uuid: string) => void,
    ): React.ReactElement {
        return (
            <ObjectWidgetComponent
                label={name}
                options={attribute.options ?? []}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
            />
        );
    }
}

export default ObjectWidget;
