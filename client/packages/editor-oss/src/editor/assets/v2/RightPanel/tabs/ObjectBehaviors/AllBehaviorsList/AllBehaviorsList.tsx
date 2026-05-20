import {forwardRef, useMemo, useState} from "react";

import {List, ListItem, ItemDescription, SearchWrapper, SearchIcon, SearchInput, NoResults} from "./AllBehaviorsList.style";
import global from "@stem/editor-oss/global";
import {BehaviorConfig, VisibilityCondition, Condition} from "../../../../../../behaviors/BehaviorConfig";

interface Props {
    addNewBehavior: (type: string) => void;
    behaviorConfigs: BehaviorConfig[];
    className?: string;
    style?: React.CSSProperties;
}

type AllBehaviorsListRef = HTMLDivElement;

const STEM_AUTHOR = ".erth";

// Helper function to get nested property value by key path (e.g., "geometry.animations.length")
const getNestedValue = (obj: any, keyPath: string): any => {
    if (!obj || !keyPath) return undefined;

    try {
        return keyPath.split(".").reduce((current, key) => {
            if (current === null || current === undefined) return undefined;
            return current[key];
        }, obj);
    } catch {
        return undefined;
    }
};

// Function to evaluate condition
const evaluateCondition = (condition: VisibilityCondition, selectedObject: any): boolean => {
    if (!selectedObject) return false;

    let actualValue = getNestedValue(selectedObject, condition.key);

    const expectedValue = condition.value;

    // Handle undefined/null values for numeric comparisons
    if (actualValue === undefined || actualValue === null) {
        if (condition.condition === Condition.IS_EQUAL) {
            return expectedValue === undefined || expectedValue === null || expectedValue === 0;
        }
        if (condition.condition === Condition.IS_NOT_EQUAL) {
            return expectedValue !== undefined && expectedValue !== null && expectedValue !== 0;
        }
        // For numeric comparisons, treat undefined as 0
        actualValue = 0;
    }

    switch (condition.condition) {
        case Condition.IS_EQUAL:
            return actualValue === expectedValue;
        case Condition.IS_NOT_EQUAL:
            return actualValue !== expectedValue;
        case Condition.IS_GREATER:
            return actualValue > expectedValue;
        case Condition.IS_GREATER_OR_EQUAL:
            return actualValue >= expectedValue;
        case Condition.IS_LESS:
            return actualValue < expectedValue;
        case Condition.IS_LESS_OR_EQUAL:
            return actualValue <= expectedValue;
        default:
            return false;
    }
};

// Function to check if behavior should be shown based on hidden conditions
const shouldShowBehavior = (config: BehaviorConfig, selectedObject: any): boolean => {
    // If no hidden conditions, show the behavior
    if (!config.visibilityConditions || config.visibilityConditions.length === 0) {
        return true;
    }

    // All conditions must be true (AND logic)
    return config.visibilityConditions.every(condition => evaluateCondition(condition, selectedObject));
};

export const AllBehaviorsList = forwardRef<AllBehaviorsListRef, Props>(
    function AllBehaviorsList({addNewBehavior, behaviorConfigs, className, style}, ref) {
        const [searchQuery, setSearchQuery] = useState("");
        const selected = global.app?.editor?.selected;

        // Get IDs of behaviors already attached to the selected object
        const attachedBehaviorIds = useMemo(() => {
            if (!selected || Array.isArray(selected)) return new Set<string>();
            const behaviors = (selected as any).userData?.behaviors || [];
            return new Set(behaviors.map((b: any) => b.id));
        }, [selected]);

        const {stemBehaviors, customBehaviors} = useMemo(() => {
            const filteredConfigs = behaviorConfigs
                .filter(
                    config =>
                        !Array.isArray(config) &&
                        !config.isHidden &&
                        !!config.id &&
                        (global?.app?.storage.debug || !config.debugOnly),
                )
                .filter(config => shouldShowBehavior(config, selected))
                .filter(config => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return config.name.toLowerCase().includes(q) ||
                        (config.description?.toLowerCase().includes(q) ?? false);
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            const stem = filteredConfigs.filter(config => config.author === STEM_AUTHOR);
            const custom = filteredConfigs.filter(config => config.author !== STEM_AUTHOR);

            return {stemBehaviors: stem, customBehaviors: custom};
        }, [behaviorConfigs, selected, searchQuery]);

        const hasResults = stemBehaviors.length > 0 || customBehaviors.length > 0;

        return (
            <List ref={ref}
                className={className}
                style={style}
            >
                <SearchWrapper>
                    <SearchIcon>
                        <svg width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M13 13L9.5 9.5M11 6C11 8.76142 8.76142 11 6 11C3.23858 11 1 8.76142 1 6C1 3.23858 3.23858 1 6 1C8.76142 1 11 3.23858 11 6Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </SearchIcon>
                    <SearchInput
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </SearchWrapper>

                {!hasResults && <NoResults>No behaviors found</NoResults>}

                {stemBehaviors.length > 0 && 
                    <>
                        {stemBehaviors.map(config => {
                            const isAttached = !config.allowMultiple && attachedBehaviorIds.has(config.id);
                            return (
                                <ListItem
                                    key={config.id}
                                    $inactive={isAttached}
                                    onClick={() => !isAttached && addNewBehavior(config.id)}
                                    className="list-item"
                                >
                                    {config.name}
                                    {config.description && 
                                        <ItemDescription><span>{config.description}</span></ItemDescription>
                                    }
                                </ListItem>
                            );
                        })}
                    </>
                }

                {customBehaviors.length > 0 && 
                    <>
                        {/*<SectionHeader>Custom Behaviors</SectionHeader>*/}
                        {customBehaviors.map(config => {
                            const isAttached = !config.allowMultiple && attachedBehaviorIds.has(config.id);
                            return (
                                <ListItem
                                    key={config.id}
                                    $inactive={isAttached}
                                    onClick={() => !isAttached && addNewBehavior(config.id)}
                                    className="list-item"
                                >
                                    {config.name}
                                    {config.description && 
                                        <ItemDescription><span>{config.description}</span></ItemDescription>
                                    }
                                </ListItem>
                            );
                        })}
                    </>
                }
            </List>
        );
    },
);
