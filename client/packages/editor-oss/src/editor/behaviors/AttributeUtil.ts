import {
    BehaviorAttribute,
    BehaviorAttributes,
    EnumAttribute,
    GroupAttribute,
    VisibilityCondition,
} from "./BehaviorAttributes";
import BehaviorAttributeType from "./BehaviorAttributeType";
import global from "@stem/editor-oss/global";

class AttributeUtil {
    static isAttributeWithConditionVisible(
        visibilityCondition: VisibilityCondition | undefined,
        currentValues: Record<string, unknown>,
    ): boolean {
        // If no condition is present, display the attribute by default
        if (!visibilityCondition) {
            return true;
        }

        // Check every condition in the visibilityCondition
        return Object.entries(visibilityCondition).every(([attributeName, expectedValue]) => {
            // Support dot notation for nested properties (e.g., "group.field")
            const currentValue = attributeName.includes(".")
                ? this.getNestedProperty(currentValues, attributeName)
                : currentValues[attributeName];

            // If the expected value is an array, check if current value is included in the array
            if (Array.isArray(expectedValue)) {
                return expectedValue.includes(currentValue);
            }

            // For the simple case, compare values directly
            return currentValue === expectedValue;
        });
    }

    static collectVisibleIfAttributes(
        attributes: BehaviorAttributes,
        attributesData: Record<string, unknown>,
    ): Record<string, unknown> {
        const trackedAttributes: Record<string, unknown> = {};
        for (const attribute of Object.values(attributes)) {
            const attr = attribute;

            if (!attr.visibleIf) {
                continue;
            }

            for (const attributeName of Object.keys(attr.visibleIf)) {
                // Support dot notation in attribute names (e.g., "group.field")
                const topLevelAttributeName = attributeName.split(".")[0];

                // check if top-level attribute is in attributes list
                if (!topLevelAttributeName || attributes[topLevelAttributeName] === undefined) {
                    console.error(
                        `Cannot find attribute "${topLevelAttributeName}" in behavior to use in visibleIf condition`,
                    );
                    continue;
                }

                // check if attribute is already tracked
                if (trackedAttributes[attributeName] === undefined) {
                    const currentValue = this.getNestedProperty(attributesData, attributeName);
                    const defaultValue = this.getNestedProperty(attributes, attributeName + ".default");
                    trackedAttributes[attributeName] = currentValue ?? defaultValue;
                }
            }
        }
        return trackedAttributes;
    }

    // helper to get attribute value or default
    static getAttributeValue(value: any, defaultValue: any): any {
        if (value === undefined || value === null || value === "") {
            return defaultValue;
        }

        // VECTOR / OBJECT fallback
        if (typeof value === "object" && defaultValue && typeof defaultValue === "object" && !Array.isArray(value)) {
            const result = {...defaultValue};

            for (const key in value) {
                if (value[key] !== undefined && value[key] !== null) {
                    result[key] = value[key];
                }
            }

            return result;
        }

        return value;
    }

    static getDefaultValueForAttribute(attribute: BehaviorAttribute): any {
        if (!attribute) return null;

        // Handle array attributes
        if (attribute.array) {
            return this.getDefaultValueForArrayAttribute(attribute);
        }

        // Handle single (non-array) attributes
        return this.getDefaultValueForSingleAttribute(attribute);
    }

    /**
     * Get default value for array attributes
     * @param attribute
     */
    private static getDefaultValueForArrayAttribute(attribute: BehaviorAttribute): any[] {
        if (!Array.isArray(attribute.default) || attribute.default.length === 0) {
            return [];
        }

        // For group arrays, ensure each element has all required attributes
        if (attribute.type === BehaviorAttributeType.Group) {
            const groupAttr = attribute as GroupAttribute;
            return attribute.default.map((item: any) => this.mergeWithGroupDefaults(item, groupAttr));
        }

        // For primitive arrays, just return a copy
        return [...attribute.default];
    }

    /**
     * Get default value for single (non-array) attributes
     * @param attribute
     */
    private static getDefaultValueForSingleAttribute(attribute: BehaviorAttribute): any {
        // Handle group attributes - create object with all nested defaults
        if (attribute.type === BehaviorAttributeType.Group) {
            return this.getDefaultValueForGroupAttribute(attribute as GroupAttribute);
        }

        // Handle enum attributes - validate and return appropriate default
        if (attribute.type === BehaviorAttributeType.Enum) {
            return this.getDefaultValueForEnumAttribute(attribute as EnumAttribute);
        }

        // Handle primitive attributes - return default or sandbox default
        return this.getDefaultValueForPrimitiveAttribute(attribute);
    }

    /**
     * Create default object for group attribute with all nested attributes
     * Priority: attribute definitions < groupAttr.default < explicit values
     * @param groupAttr
     */
    private static getDefaultValueForGroupAttribute(groupAttr: GroupAttribute): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        // First, collect defaults from attribute definitions (base layer)
        if (groupAttr.attributes) {
            for (const [key, attr] of Object.entries(groupAttr.attributes)) {
                result[key] = this.getDefaultValueForAttribute(attr);
            }
        }

        // Then, merge with explicit default if provided (overrides attribute defaults)
        if (groupAttr.default && typeof groupAttr.default === "object" && !Array.isArray(groupAttr.default)) {
            this.deepMergeDefaults(result, groupAttr.default);
        }

        return result;
    }

    /**
     * Deep merge default values from source into target
     * Recursively merges objects, but overwrites arrays and primitives
     * @param target
     * @param source
     */
    private static deepMergeDefaults(target: Record<string, unknown>, source: Record<string, unknown>): void {
        for (const key in source) {
            const sourceValue = source[key];
            const targetValue = target[key];

            // Both are plain objects (not arrays) - recursively merge
            if (
                sourceValue &&
                typeof sourceValue === "object" &&
                !Array.isArray(sourceValue) &&
                targetValue &&
                typeof targetValue === "object" &&
                !Array.isArray(targetValue)
            ) {
                this.deepMergeDefaults(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
            } else {
                // Override with source value (arrays, primitives, or mixed types)
                target[key] = sourceValue;
            }
        }
    }

    /**
     * Merge provided item with group attribute defaults to ensure all fields exist
     * @param item
     * @param groupAttr
     */
    private static mergeWithGroupDefaults(item: object, groupAttr: GroupAttribute): Record<string, unknown> {
        const defaults = this.getDefaultValueForGroupAttribute(groupAttr);
        return {...defaults, ...item};
    }

    /**
     * Get default value for enum attribute, validating it exists in options
     * @param enumAttr
     */
    private static getDefaultValueForEnumAttribute(enumAttr: EnumAttribute): any {
        const isSandboxMode = (global as {app?: {editor?: {isSandbox?: boolean}}})?.app?.editor?.isSandbox;
        const hasDefaultSandbox = enumAttr.defaultSandbox !== undefined;

        // Check for sandbox default first (if in sandbox mode)
        if (isSandboxMode && hasDefaultSandbox) {
            const sandboxDefault = enumAttr.defaultSandbox;
            const found = enumAttr.options.some(opt => opt.value === sandboxDefault);
            if (found) {
                return sandboxDefault;
            }
        }

        // Check for regular default
        if (enumAttr.default !== undefined) {
            const found = enumAttr.options.some(opt => opt.value === enumAttr.default);
            if (found) {
                return enumAttr.default;
            }
        }

        // Fallback to first option
        if (enumAttr.options && enumAttr.options.length > 0) {
            return enumAttr.options[0]?.value ?? null;
        }

        return null;
    }

    /**
     * Get default value for primitive attributes (number, string, boolean, etc.)
     * @param attribute
     */
    private static getDefaultValueForPrimitiveAttribute(attribute: BehaviorAttribute): any {
        const isSandboxMode = (global as {app?: {editor?: {isSandbox?: boolean}}})?.app?.editor?.isSandbox;
        const hasDefaultSandbox = attribute.defaultSandbox !== undefined;

        // Use sandbox default if in sandbox mode and it exists
        if (isSandboxMode && hasDefaultSandbox) {
            return attribute.defaultSandbox;
        }

        return attribute.default !== undefined ? attribute.default : null;
    }

    /**
     * Set a nested property using dot notation (e.g., "buttons.0.buttonPosition.x")
     * @param obj
     * @param path
     * @param value
     */
    static setNestedProperty(obj: any, path: string, value: any): void {
        const keys = path.split(".");
        let current = obj;

        // Navigate to the parent of the target property
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            const nextKey = keys[i + 1];

            // Handle array indices (e.g., "0", "1", etc.)
            if (!isNaN(Number(key))) {
                const index = Number(key);
                if (!Array.isArray(current)) {
                    console.warn(`Expected array at path "${keys.slice(0, i).join(".")}" but found:`, current);
                    return;
                }
                if (!current[index]) {
                    // Determine if next level should be array or object
                    current[index] = !isNaN(Number(nextKey)) ? [] : {};
                }
                current = current[index];
            } else {
                // Handle object properties
                if (key !== undefined) {
                    if (!current[key]) {
                        // Determine if next level should be array or object
                        current[key] = !isNaN(Number(nextKey)) ? [] : {};
                    }
                    current = current[key];
                }
            }
        }

        // Set the final property
        const finalKey = keys[keys.length - 1];
        if (finalKey !== undefined) {
            if (!isNaN(Number(finalKey)) && Array.isArray(current)) {
                // Setting array element
                current[Number(finalKey)] = value;
            } else {
                // Setting object property
                current[finalKey] = value;
            }
        }
    }

    /**
     * Get a nested property using dot notation (e.g., "buttons.0.buttonPosition.x")
     * @param obj
     * @param path
     */
    static getNestedProperty(obj: any, path: string): any {
        const keys = path.split(".");
        let current = obj;

        for (const key of keys) {
            if (current == null) {
                return undefined;
            }

            // Check if key looks like a number and current is an array
            if (!isNaN(Number(key)) && Array.isArray(current)) {
                const index = Number(key);
                if (current[index] === undefined) {
                    return undefined;
                }
                current = current[index];
            } else {
                // Handle object properties (including numeric string keys on objects)
                if (typeof current !== "object" || current[key] === undefined) {
                    return undefined;
                }
                current = current[key];
            }
        }

        return current;
    }
}

export default AttributeUtil;
