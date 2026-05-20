import React from "react";
import ReactDOM from "react-dom/client";
import styled from "styled-components";

import {BehaviorAttribute, GroupAttribute} from "../BehaviorAttributes";
import AttributeWidget from "./AttributeWidget";
import BaseAttributeWidget from "./BaseAttributeWidget";
import WidgetFactory from "./WidgetFactory";
import {ExpandButton} from "../../assets/v2/LeftPanel/MainTabs/AssetsTab/AssetsRows/AssetsRows.style";
import arrowDown from "../../assets/v2/LeftPanel/MainTabs/AssetsTab/AssetsRows/icons/arrow-down.svg";
import {SelectRow} from "../../assets/v2/RightPanel/common/SelectRow";
import {Separator} from "../../assets/v2/RightPanel/common/Separator";
import {Label} from "../../assets/v2/RightPanel/RightPanel.style";
import AttributeUtil from "../AttributeUtil";

const GroupContainer = styled.div<{$nestingLevel?: number}>`
    width: 100%;
    box-sizing: border-box;
    padding-left: ${props => (props.$nestingLevel ? props.$nestingLevel * 8 : 0)}px;
`;

const GroupHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 32px;
    margin-bottom: 16px !important;
`;

const GroupContent = styled.div`
    width: 100%;
    box-sizing: border-box;
    padding-left: 8px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    row-gap: 16px;

    * {
        margin-bottom: 0;
    }

    & .widget-container {
        width: 100%;
    }

    & input,
    & select {
        max-width: 100%;
    }
`;

const PresetContainer = styled.div`
    margin-bottom: 12px;
`;

const GroupComponent: React.FC<{
    id: string;
    name: string;
    attribute: GroupAttribute;
    getCurrentValue: () => any;
    updateBehaviorField: (value: any) => void;
    widgetFactory: WidgetFactory;
    nestingLevel: number;
}> = ({id, name, attribute, getCurrentValue, updateBehaviorField, widgetFactory, nestingLevel}) => {
    const [values, setValues] = React.useState<Record<string, any>>(getCurrentValue() || {});
    const [expanded, setExpanded] = React.useState(true);
    const [currentPreset, setCurrentPreset] = React.useState<string>(getCurrentValue()?.__preset__ ?? "Custom");

    React.useEffect(() => {
        const currentValues = getCurrentValue();
        if (currentValues) {
            setValues(currentValues);
            if (currentValues.__preset__ && currentValues.__preset__ !== currentPreset) {
                setCurrentPreset(currentValues.__preset__);
            }
        } else {
            setValues({});
        }
    }, [getCurrentValue]);

    const handleFieldChange = (fieldName: string, fieldValue: any) => {
        const newValues = {...values, [fieldName]: fieldValue};
        setValues(newValues);
        updateBehaviorField(newValues);
    };

    const handlePresetChange = (item: any) => {
        const presetName = item.realValue;
        setCurrentPreset(presetName);
        if (presetName.toLowerCase() === "custom") return;

        const selectedPreset = attribute.presets?.find(p => p.name === presetName);
        if (selectedPreset) {
            const newValues = {
                __preset__: presetName,
                ...selectedPreset.values,
            };
            setValues(newValues);
            updateBehaviorField(newValues);
        }
    };

    const hasPresets = !!attribute.presets?.length;
    const presetOptions = React.useMemo(() => {
        return (
            attribute.presets?.map(preset => ({
                key: preset.name,
                value: preset.name,
                realValue: preset.name,
            })) ?? []
        );
    }, [attribute.presets]);

    const selectedPresetItem = presetOptions.find(item => item.realValue === currentPreset);

    if (!attribute.attributes || Object.keys(attribute.attributes).length === 0) {
        return <div>Group is empty</div>;
    }

    return (
        <GroupContainer $nestingLevel={nestingLevel}>
            {name && (
                <>
                    <Separator margin="0" />
                    <GroupHeader>
                        <Label
                            style={{marginBottom: 0}}
                            $regular
                        >
                            {name}
                        </Label>
                        <ExpandButton
                            className="reset-css"
                            $expanded={expanded}
                            onClick={() => setExpanded(prev => !prev)}
                        >
                            <img
                                src={arrowDown}
                                alt="show more"
                            />
                        </ExpandButton>
                    </GroupHeader>
                </>
            )}
            {expanded && (
                <>
                    {hasPresets && (
                        <PresetContainer>
                            <SelectRow
                                label="Preset"
                                value={selectedPresetItem}
                                data={presetOptions}
                                onChange={handlePresetChange}
                                $margin="8px 0"
                            />
                            <Separator margin="8px 0" />
                        </PresetContainer>
                    )}
                    {(!hasPresets || currentPreset.toLowerCase() === "custom") && (
                        <GroupContent>
                            {Object.entries(attribute.attributes).map(([fieldName, fieldAttribute]) => {
                                if (fieldAttribute.invisible) return null;
                                if (
                                    fieldAttribute.visibleIf &&
                                    !AttributeUtil.isAttributeWithConditionVisible(fieldAttribute.visibleIf, values)
                                )
                                    return null;

                                const fieldId = `${id}-${fieldName}`;
                                const widget = widgetFactory.createWidget(fieldAttribute);
                                if (!widget) return null;

                                return (
                                    <GroupFieldItem
                                        key={fieldId}
                                        fieldId={fieldId}
                                        fieldName={fieldName}
                                        fieldAttribute={fieldAttribute}
                                        widget={widget}
                                        values={values}
                                        handleFieldChange={handleFieldChange}
                                        nestingLevel={nestingLevel}
                                    />
                                );
                            })}
                        </GroupContent>
                    )}
                </>
            )}
        </GroupContainer>
    );
};

const GroupFieldItem: React.FC<{
    fieldId: string;
    fieldName: string;
    fieldAttribute: BehaviorAttribute;
    widget: AttributeWidget;
    values: any;
    handleFieldChange: (fieldName: string, value: any) => void;
    nestingLevel: number;
}> = ({fieldId, fieldName, fieldAttribute, widget, values, handleFieldChange, nestingLevel}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const rootRef = React.useRef<ReactDOM.Root | null>(null);

    React.useEffect(() => {
        if (containerRef.current) {
            if (!rootRef.current) {
                rootRef.current = ReactDOM.createRoot(containerRef.current);
            }

            // Set nesting level for nested groups
            if (fieldAttribute.type === "group" && widget.constructor.name === "GroupWidget") {
                (widget as any).nestingLevel = nestingLevel + 1;
            }

            widget.build(
                fieldId,
                fieldAttribute.name || fieldName,
                fieldAttribute,
                () => AttributeUtil.getAttributeValue(values[fieldName], fieldAttribute.default),
                value => handleFieldChange(fieldName, value),
                rootRef.current,
            );
        }
    }, [fieldId, fieldName, fieldAttribute, widget, values, handleFieldChange, nestingLevel]);

    return (
        <div
            className="widget-container"
            ref={containerRef}
            id={fieldId}
        />
    );
};

class GroupWidget extends BaseAttributeWidget {
    private group: GroupAttribute;
    private widgetFactory: WidgetFactory;
    nestingLevel: number;

    constructor(group: GroupAttribute, widgetFactory: WidgetFactory, nestingLevel: number = 0) {
        super();
        this.group = group;
        this.widgetFactory = widgetFactory;
        this.nestingLevel = nestingLevel;
    }

    protected getContainerPrefix(): string {
        return "widget-group";
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: GroupAttribute,
        getCurrentValue: () => any,
        updateBehaviorField: (value: any) => void,
    ): React.ReactElement {
        return (
            <GroupComponent
                id={id}
                name={name}
                attribute={attribute}
                getCurrentValue={getCurrentValue}
                updateBehaviorField={updateBehaviorField}
                widgetFactory={this.widgetFactory}
                nestingLevel={this.nestingLevel}
            />
        );
    }
}

export default GroupWidget;
