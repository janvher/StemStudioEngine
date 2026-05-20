import React from "react";
import ReactDOM from "react-dom/client";
import styled from "styled-components";

import { ArrayAttribute, BehaviorAttribute, GroupAttribute, NumberAttribute } from "../BehaviorAttributes";
import AttributeWidget from "./AttributeWidget";
import BaseAttributeWidget from "./BaseAttributeWidget";
import { PlusRow } from "../../../editor/assets/v2/RightPanel/common/PlusRow";
import deleteIcon from "../../../editor/assets/v2/RightPanel/tabs/ObjectBehaviors/icons/delete.svg";
import { Separator } from "../../assets/v2/RightPanel/common/Separator";
import { Label } from "../../assets/v2/RightPanel/RightPanel.style";
import AttributeUtil from "../AttributeUtil";

interface ArrayElementAdapterProps {
    itemId: string;
    value: any;
    attribute: BehaviorAttribute;
    widget: AttributeWidget;
    onChange: (index: number, value: any) => void;
    onDelete: () => void;
    index: number;
}

const Container = styled.div`
    display: flex;
    align-items: center;
    position: relative;
    padding-top: 4px;
    padding-bottom: 4px;
    width: 100%;
    font-size: 12px;
    box-sizing: border-box;
`;

const Content = styled.div`
    flex-grow: 1;
    display: flex;
    align-items: center;
    min-height: 32px;
    min-width: 0;
`;

const DeleteIcon = styled.img`
    cursor: pointer;
    position: absolute;
    right: 0px;
    width: 24px;
    height: 24px;
`;

const Wrapper = styled.div`
    width: 100%;
    box-sizing: border-box;
`;

interface ArrayComponrntProps {
    id: string,
    name: string,
    attribute: BehaviorAttribute,
    getCurrentValue: () => any[],
    updateBehaviorField: (value: any[]) => void,
    innerWidget: AttributeWidget,
}

/**
 * Find the scrollable parent element and return it along with current scroll position
 * @param element
 */
const getScrollableParent = (element: HTMLElement | null): { parent: HTMLElement | null; scrollTop: number } => {
    let current = element;
    while (current) {
        const style = window.getComputedStyle(current);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
            return { parent: current, scrollTop: current.scrollTop };
        }
        current = current.parentElement;
    }
    return { parent: null, scrollTop: 0 };
};

/**
 * Get the normalizeField config from a group attribute (if present)
 * @param attribute
 */
const getNormalizeConfig = (attribute: BehaviorAttribute): { field: string; max: number } | null => {
    const group = attribute as GroupAttribute;
    if (!group.normalizeField || !group.attributes) return null;
    const fieldAttr = group.attributes[group.normalizeField] as NumberAttribute | undefined;
    return { field: group.normalizeField, max: fieldAttr?.max ?? 100 };
};

/**
 * Redistribute values for a normalized field so they sum to maxTotal.
 * changedIndex is the item the user just edited (kept as-is); others are scaled proportionally.
 * @param items
 * @param field
 * @param maxTotal
 * @param changedIndex
 */
const normalizeValues = (
    items: any[],
    field: string,
    maxTotal: number,
    changedIndex: number,
): any[] => {
    if (items.length <= 1) return items;

    const remaining = maxTotal - (items[changedIndex]?.[field] ?? 0);
    const otherSum = items.reduce(
        (sum, item, i) => i !== changedIndex ? sum + (item[field] || 0) : sum, 0,
    );

    const result = items.map((item, i) => {
        if (i === changedIndex) return item;
        const oldVal = item[field] || 0;
        const newVal = otherSum > 0
            ? Math.round(oldVal / otherSum * remaining)
            : Math.round(remaining / (items.length - 1));
        return { ...item, [field]: Math.max(0, newVal) };
    });

    // Fix rounding error on the largest non-changed item
    const total = result.reduce((sum, item) => sum + (item[field] || 0), 0);
    if (total !== maxTotal) {
        const diff = maxTotal - total;
        let maxIdx = -1, maxVal = -1;
        for (let i = 0; i < result.length; i++) {
            if (i !== changedIndex && result[i][field] > maxVal) {
                maxVal = result[i][field];
                maxIdx = i;
            }
        }
        if (maxIdx >= 0) {
            result[maxIdx] = { ...result[maxIdx], [field]: result[maxIdx][field] + diff };
        }
    }

    return result;
};

/**
 * Distribute a normalized field equally across all items.
 * @param items
 * @param field
 * @param maxTotal
 */
const distributeEvenly = (items: any[], field: string, maxTotal: number): any[] => {
    if (items.length === 0) return items;
    const share = Math.round(maxTotal / items.length);
    const result = items.map(item => ({ ...item, [field]: share }));
    // Fix rounding on last item
    const total = result.reduce((sum, item) => sum + item[field], 0);
    if (total !== maxTotal) {
        result[result.length - 1] = {
            ...result[result.length - 1],
            [field]: result[result.length - 1][field] + (maxTotal - total),
        };
    }
    return result;
};

const ArrayComponent = ({ name, attribute, getCurrentValue, updateBehaviorField, id, innerWidget }: ArrayComponrntProps) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const pendingScrollRestore = React.useRef<{ parent: HTMLElement; scrollTop: number } | null>(null);

    const [values, setValues] = React.useState<any[]>(() => {
        const current = getCurrentValue();
        return Array.isArray(current) ? current : [];
    });

    // Adding state to track unique identifiers
    const [itemIds, setItemIds] = React.useState<string[]>(() =>
        Array.isArray(getCurrentValue())
            ? getCurrentValue().map(() => crypto.randomUUID())
            : [],
    );

    // Restore scroll position after any render that has a pending restore
    React.useLayoutEffect(() => {
        if (pendingScrollRestore.current) {
            const { parent, scrollTop } = pendingScrollRestore.current;
            parent.scrollTop = scrollTop;

            // Also schedule delayed restores to handle async updates (like behavior refresh)
            const timeouts = [0, 50, 100, 250].map(delay =>
                setTimeout(() => {
                    parent.scrollTop = scrollTop;
                }, delay),
            );

            pendingScrollRestore.current = null;

            return () => timeouts.forEach(clearTimeout);
        }
    }, [values, itemIds]);

    React.useEffect(() => {
        const currentValues = getCurrentValue();
        const newValues = Array.isArray(currentValues) ? currentValues : [];
        setValues(newValues);

        // Updating identifiers when external values change
        if (newValues.length !== itemIds.length) {
            setItemIds(newValues.map(() => crypto.randomUUID()));
        }
    }, [getCurrentValue]);

    const defaultValue =
        Array.isArray(attribute.default) && attribute.default.length > 0
            ? attribute.default[0]
            : null;

    const handleAddItem = () => {
        // Save scroll position before modifying
        const { parent, scrollTop } = getScrollableParent(containerRef.current);
        if (parent) {
            pendingScrollRestore.current = { parent, scrollTop };
        }

        // TODO: fix nested attributes handling
        const attributeCopy = { ...attribute, array: false }; // Remove array flag for single item
        const newItemValue = AttributeUtil.getDefaultValueForAttribute(attributeCopy);
        let newValue = [...values, newItemValue];

        // Auto-distribute normalized field evenly when adding a new item
        const config = getNormalizeConfig(attribute);
        if (config) {
            newValue = distributeEvenly(newValue, config.field, config.max);
        }

        setValues(newValue);
        setItemIds(prev => [...prev, crypto.randomUUID()]);
        updateBehaviorField(newValue);
    };

    const handleRemoveItem = (index: number) => {
        // Save scroll position before modifying
        const { parent, scrollTop } = getScrollableParent(containerRef.current);
        if (parent) {
            pendingScrollRestore.current = { parent, scrollTop };
        }

        setValues(prevValues => {
            const newValues = [...prevValues];
            newValues.splice(index, 1);

            // Redistribute normalized field proportionally after removal
            const config = getNormalizeConfig(attribute);
            if (config && newValues.length > 0) {
                const currentSum = newValues.reduce((sum, item) => sum + (item[config.field] || 0), 0);
                if (currentSum > 0 && currentSum !== config.max) {
                    for (let i = 0; i < newValues.length; i++) {
                        newValues[i] = {
                            ...newValues[i],
                            [config.field]: Math.round(newValues[i][config.field] / currentSum * config.max),
                        };
                    }
                    // Fix rounding on last item
                    const total = newValues.reduce((sum, item) => sum + item[config.field], 0);
                    if (total !== config.max) {
                        const last = newValues.length - 1;
                        newValues[last] = {
                            ...newValues[last],
                            [config.field]: newValues[last][config.field] + (config.max - total),
                        };
                    }
                } else if (currentSum === 0) {
                    const distributed = distributeEvenly(newValues, config.field, config.max);
                    for (let i = 0; i < newValues.length; i++) {
                        newValues[i] = distributed[i];
                    }
                }
            }

            updateBehaviorField(newValues);
            return newValues;
        });

        setItemIds(prev => {
            const newIds = [...prev];
            newIds.splice(index, 1);
            return newIds;
        });
    };

    const handleItemChange = React.useCallback((index: number, value: any) => {
        setValues(prev => {
            // Use functional state update for immutability
            let newValues = [...prev];
            // If the value is an object, perform an immutable update
            if (typeof value === 'object' && value !== null) {
                newValues[index] = { ...newValues[index], ...value };
            } else {
                newValues[index] = value;
            }

            // Auto-normalize if the changed field is the normalized field
            const config = getNormalizeConfig(attribute);
            if (config && typeof value === 'object' && value !== null && config.field in value) {
                newValues = normalizeValues(newValues, config.field, config.max, index);
            }

            // Call updateBehaviorField only after state update
            updateBehaviorField(newValues);
            return newValues;
        });
    }, [updateBehaviorField, attribute]);

    return (
        <div ref={containerRef}>
            <Label $regular>{name}</Label>
            {values.map((value, index) => {
                const itemKey = itemIds[index] || `${id}-item-${index}`;
                return (
                    <ArrayElementAdapter
                        key={itemKey}
                        itemId={`${id}-item-${index}`}
                        value={value}
                        attribute={attribute}
                        widget={innerWidget}
                        onChange={handleItemChange}
                        onDelete={() => handleRemoveItem(index)}
                        index={index}
                    />
                );
            })}
            <Separator margin="8px 0" />
            <PlusRow label={(attribute as GroupAttribute).addItemLabel || "Add item"}
                callback={handleAddItem}
            />
            <Separator margin="8px 0" />
        </div>
    );
};

// Optimized with React.memo to prevent unnecessary re-renders
const ArrayElementAdapter = React.memo(
    ({ itemId, value, attribute, widget, onChange, onDelete, index }: ArrayElementAdapterProps) => {
        const containerRef = React.useRef<HTMLDivElement>(null);
        const rootRef = React.useRef<ReactDOM.Root | null>(null);
        // Use ref to always have access to current value without rebuilding widget
        const valueRef = React.useRef(value);
        valueRef.current = value;

        React.useEffect(() => {
            //console.log(`ArrayElementAdapter - itemId: ${itemId}`, attribute);

            if (containerRef.current) {
                if (!rootRef.current) {
                    rootRef.current = ReactDOM.createRoot(containerRef.current);
                }

                widget.build(
                    itemId,
                    "",
                    attribute,
                    () => valueRef.current,
                    (newValue) => onChange(index, newValue),
                    rootRef.current,
                );
            }
        }, [itemId, widget, attribute, onChange]);

        // Important: Using valueRef.current in getCurrentValue ensures we always
        // have access to the latest value without rebuilding the widget on every change.
        // This prevents unnecessary re-renders while still keeping data in sync.

        return (
            <Wrapper>
                <Container>
                    <span>{(attribute as GroupAttribute).itemLabel || "Item"} {index + 1}</span><DeleteIcon src={deleteIcon}
                        className="icon"
                        onClick={onDelete}
                                                                                                />
                </Container>
                <Container>
                    <Content ref={containerRef}
                        id={itemId}
                    />
                </Container>
            </Wrapper>
        );
    },
    (prevProps, nextProps) => {
        if (prevProps.itemId !== nextProps.itemId ||
            prevProps.index !== nextProps.index ||
            prevProps.widget !== nextProps.widget ||
            prevProps.attribute !== nextProps.attribute ||
            prevProps.value !== nextProps.value) {
            return false; // re-render needed
        }

        return true; // no re-render needed
    },
);

class ArrayAttributeWidget extends BaseAttributeWidget {
    private innerWidget: AttributeWidget;
    private attribute: ArrayAttribute;

    constructor(innerWidget: AttributeWidget, attribute: ArrayAttribute) {
        super();
        this.innerWidget = innerWidget;
        this.attribute = attribute;
    }

    protected getContainerPrefix(): string {
        return `widget-array-${this.attribute.type}`;
    }

    protected createComponent(
        id: string,
        name: string,
        attribute: BehaviorAttribute,
        getCurrentValue: () => any[],
        updateBehaviorField: (value: any[]) => void,
    ): React.ReactElement {
        return <ArrayComponent innerWidget={this.innerWidget}
            id={id}
            name={name}
            attribute={attribute}
            getCurrentValue={getCurrentValue}
            updateBehaviorField={updateBehaviorField}
               />;
    }
}

export default ArrayAttributeWidget;
