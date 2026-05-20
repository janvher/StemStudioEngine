import BehaviorAttributeConverter from "../BehaviorAttributeConverter";
import {BehaviorAttributeData, BehaviorAttribute,GroupAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class GroupAttributeConverter implements AttributeConverter {
    private attributeConverter: BehaviorAttributeConverter;

    constructor(attributeConverter: BehaviorAttributeConverter) {
        this.attributeConverter = attributeConverter;
    }

    convertAttribute(
        attributeData: BehaviorAttributeData,
        behaviorContext: BehaviorContext,
    ): GroupAttribute {
        const groupAttributes: Record<string, BehaviorAttribute> = {};

        // Convert group attributes (templates already resolved at this point)
        if (attributeData.attributes) {
            for (const [key, attr] of Object.entries(
                attributeData.attributes as Record<string, BehaviorAttributeData>,
            )) {
                const attributeType = attr.type as BehaviorAttributeType;
                const converter = this.attributeConverter.getAttributeConverter(attributeType);

                if (converter) {
                    groupAttributes[key] = converter.convertAttribute(attr, behaviorContext);
                } else {
                    console.error(`Converter not found for attribute type "${attributeType}"`);
                }
            }
        }

        // Convert default values for groups (both regular and array groups)
        let convertedDefault = attributeData.default;
        
        if (attributeData.array && Array.isArray(attributeData.default)) {
            // For array groups, convert each item in the array
            convertedDefault = attributeData.default.map((defaultItem: any) => {
                return this.convertDefaultItem(defaultItem, attributeData.attributes, behaviorContext);
            });
        } else if (attributeData.default && typeof attributeData.default === 'object') {
            // For regular (non-array) groups, convert the default object
            convertedDefault = this.convertDefaultItem(attributeData.default, attributeData.attributes, behaviorContext);
        }

        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Group,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: convertedDefault,
            attributes: groupAttributes,
            presets: attributeData.presets || [],
            addItemLabel: attributeData.addItemLabel,
            itemLabel: attributeData.itemLabel,
            order: attributeData.order || 0,
            normalizeField: attributeData.normalizeField,
        };
    }

    /**
     * Recursively convert default values for group items
     * Always initializes ALL fields with their default values
     * @param defaultItem
     * @param attributes
     * @param behaviorContext
     */
    private convertDefaultItem(
        defaultItem: any, 
        attributes: Record<string, BehaviorAttributeData> | undefined, 
        behaviorContext: BehaviorContext,
    ): Record<string, any> {
        const convertedItem: Record<string, any> = {};
        
        if (!attributes) {
            return defaultItem || {};
        }
        
        // Initialize ALL fields with their default values (merged with provided values)
        for (const [key, attr] of Object.entries(attributes)) {
            const attributeType = attr.type as BehaviorAttributeType;
            const converter = this.attributeConverter.getAttributeConverter(attributeType);
            
            let valueToUse: any;
            
            // Special handling for arrays - merge elements by index
            if (Array.isArray(defaultItem?.[key]) && Array.isArray(attr.default)) {
                valueToUse = this.mergeArrayDefaults(attr.default, defaultItem[key]);
            } else if (defaultItem && defaultItem[key] !== undefined) {
                // Use provided value
                valueToUse = defaultItem[key];
            } else if (attr.default !== undefined) {
                // Use attribute's default
                valueToUse = attr.default;
            } else if (attributeType === 'group' && attr.attributes) {
                // For groups without default, collect defaults from nested attributes
                valueToUse = {};
                for (const [nestedKey, nestedAttr] of Object.entries(attr.attributes as Record<string, BehaviorAttributeData>)) {
                    if (nestedAttr.default !== undefined) {
                        valueToUse[nestedKey] = nestedAttr.default;
                    }
                }
            } else {
                valueToUse = undefined;
            }
            
            if (converter) {
                // Create a temporary attribute data with the value
                const tempAttrData = { ...attr, default: valueToUse };
                const convertedAttr = converter.convertAttribute(tempAttrData, behaviorContext);
                convertedItem[key] = convertedAttr.default;
            } else {
                // Fallback if no converter found
                convertedItem[key] = valueToUse;
            }
        }
        
        return convertedItem;
    }

    /**
     * Merge two default arrays by merging elements at each index
     * @param templateDefault
     * @param attributeDefault
     */
    private mergeArrayDefaults(templateDefault: any[], attributeDefault: any[]): any[] {
        const result: any[] = [];
        const maxLength = Math.max(templateDefault.length, attributeDefault.length);

        for (let i = 0; i < maxLength; i++) {
            const templateItem = templateDefault[i];
            const attributeItem = attributeDefault[i];

            if (attributeItem !== undefined && templateItem !== undefined) {
                // Both have elements - merge objects or use attribute value
                if (typeof templateItem === 'object' && !Array.isArray(templateItem) &&
                    typeof attributeItem === 'object' && !Array.isArray(attributeItem)) {
                    // Merge objects
                    result[i] = { ...templateItem, ...attributeItem };
                } else {
                    // Use attribute value
                    result[i] = attributeItem;
                }
            } else if (attributeItem !== undefined) {
                result[i] = attributeItem;
            } else {
                result[i] = templateItem;
            }
        }

        return result;
    }
}

export default GroupAttributeConverter;
