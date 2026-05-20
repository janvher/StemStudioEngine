import {BehaviorAttributeData, BehaviorAttributes} from "./BehaviorAttributes";
import BehaviorAttributeType from "./BehaviorAttributeType";
import {BehaviorContext} from "./BehaviorContextProvider";
import AttributeConverter from "./converters/AttributeConverter";

class BehaviorAttributeConverter {
    private attributeConverters: Map<string, AttributeConverter> = new Map();

    constructor() {}

    registerAttributeConverter(attributeType: BehaviorAttributeType, attributeConverter: AttributeConverter): void {
        if (this.attributeConverters.has(attributeType)) {
            console.error(`Attribute converter for "${attributeType}" already exists`);
            return;
        }

        this.attributeConverters.set(attributeType, attributeConverter);
    }

    convert(
        attributeData: Record<string, BehaviorAttributeData>,
        behaviorContext: BehaviorContext,
        templates?: Record<string, BehaviorAttributeData>,
    ): BehaviorAttributes {
        // First, resolve all templates recursively in the entire structure
        const resolvedAttributeData = this.resolveAllTemplates(attributeData, templates);
        
        const newAttributes: BehaviorAttributes = {};

        for (const key in resolvedAttributeData) {
            const attribute = resolvedAttributeData[key];
            if (!attribute) continue;
            
            const newAttribute = this.convertSingleAttribute(attribute, behaviorContext);
            newAttributes[key] = newAttribute;
        }
        return newAttributes;
    }

    /**
     * Recursively resolves all template references in the attribute data structure
     * @param attributeData
     * @param templates
     */
    private resolveAllTemplates(
        attributeData: Record<string, BehaviorAttributeData>,
        templates?: Record<string, BehaviorAttributeData>,
    ): Record<string, BehaviorAttributeData> {
        const resolved: Record<string, BehaviorAttributeData> = {};
        
        for (const key in attributeData) {
            const attribute = attributeData[key];
            if (!attribute) continue;
            
            resolved[key] = this.resolveTemplateRecursive(attribute, templates);
        }
        
        return resolved;
    }

    /**
     * Recursively resolves template references in a single attribute and its nested attributes
     * @param attributeData
     * @param templates
     */
    private resolveTemplateRecursive(
        attributeData: BehaviorAttributeData,
        templates?: Record<string, BehaviorAttributeData>,
    ): BehaviorAttributeData {
        // First resolve this attribute's template if it has one
        let resolved = this.resolveTemplate(attributeData, templates);
        
        // Then recursively resolve templates in nested attributes (for groups)
        if (resolved.attributes) {
            const resolvedNestedAttributes: Record<string, BehaviorAttributeData> = {};
            
            for (const key in resolved.attributes) {
                const nestedAttr = resolved.attributes[key];
                if (nestedAttr) {
                    resolvedNestedAttributes[key] = this.resolveTemplateRecursive(nestedAttr, templates);
                }
            }
            
            resolved = {
                ...resolved,
                attributes: resolvedNestedAttributes,
            };
        }
        
        return resolved;
    }

    /**
     * Resolves template reference if present, merging template with overrides
     * @param attributeData
     * @param templates
     */
    private resolveTemplate(
        attributeData: BehaviorAttributeData,
        templates?: Record<string, BehaviorAttributeData>,
    ): BehaviorAttributeData {
        if (!attributeData.template || !templates) {
            return attributeData;
        }

        const template = templates[attributeData.template];
        if (!template) {
            console.warn(`Template "${attributeData.template}" not found, using attribute as-is`);
            return attributeData;
        }

        // Warn if trying to override template type
        if (attributeData.type && attributeData.type !== template.type) {
            console.warn(
                `Attempting to override template type: template "${attributeData.template}" has type "${template.type}", ` +
                `but attribute "${attributeData.name || 'unnamed'}" tries to override it with "${attributeData.type}". ` +
                `Template type will be used.`,
            );
        }

        // Deep merge: copy everything from template, then override with attributeData
        const merged = this.deepMerge(template, attributeData);
        
        // Special handling for 'default' - merge template default with attribute default
        if (template.default !== undefined && attributeData.default !== undefined) {
            merged.default = this.deepMerge(template.default, attributeData.default);
        } else if (attributeData.default !== undefined) {
            // Only attributeData has default - use it
            merged.default = attributeData.default;
        } else if (template.default !== undefined) {
            // Only template has default - use it
            merged.default = template.default;
        }
        
        // Remove the template reference from the merged result
        delete merged.template;
        return merged;
    }

    /**
     * Deep merge two objects, with target overriding source properties
     * Copies all properties from source, then overrides with target properties
     * @param source
     * @param target
     */
    private deepMerge(source: any, target: any): any {
        // Start with all properties from source
        const result = {...source};

        // Override with properties from target
        for (const key in target) {
            if (key === 'template') continue; // skip template key in merge

            if (target[key] === undefined) {
                continue;
            }

            // Check if both source and target have objects at this key (and not arrays)
            const sourceIsObject = result[key] && typeof result[key] === 'object' && !Array.isArray(result[key]);
            const targetIsObject = target[key] && typeof target[key] === 'object' && !Array.isArray(target[key]);

            if (sourceIsObject && targetIsObject) {
                // Recursively merge nested objects
                result[key] = this.deepMerge(result[key], target[key]);
            } else {
                // Override with target value (including arrays and primitives)
                result[key] = target[key];
            }
        }

        return result;
    }

    convertSingleAttribute(
        attributeData: BehaviorAttributeData,
        behaviorContext: BehaviorContext,
    ): any {
        const attributeType = attributeData.type as BehaviorAttributeType;
        let attributeConverter = this.getAttributeConverter(attributeType);
        if (!attributeConverter) {
            console.warn(`No converter for attribute "${attributeData.name}" with type "${attributeType}", falling back to string.`);
            attributeConverter = this.getAttributeConverter("string");
            if (!attributeConverter) {
                console.error(`Failed to convert attribute "${attributeData.name}" — string fallback also missing.`);
                return null;
            }
        }

        const newAttribute = attributeConverter.convertAttribute(attributeData, behaviorContext);
        if (newAttribute.array && !Array.isArray(newAttribute.default)) {
            console.warn(
                `Attribute "${attributeData.name}" is marked as array, but default value is not an array. Overwriting default value to an empty array.`,
            );
            newAttribute.default = [];
        }

        return newAttribute;
    }

    getAttributeConverter(attributeType: BehaviorAttributeType | string): AttributeConverter | null {
        const attributeConverter = this.attributeConverters.get(attributeType);
        if (!attributeConverter) {
            console.error(`Attribute converter for "${attributeType}" not found`);
            return null;
        }

        return attributeConverter;
    }
}

export default BehaviorAttributeConverter;
