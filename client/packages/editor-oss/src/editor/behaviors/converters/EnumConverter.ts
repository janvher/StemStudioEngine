import {BehaviorAttributeData, EnumAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class EnumAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): EnumAttribute {
        let options = attributeData.options;
        let defaultValue = attributeData.default;

        // Normalize string options into {label, value} objects
        if (options) {
            options = options.map((item: any) => {
                if (typeof item === "object" && item !== null && "label" in item && "value" in item) {
                    return item;
                }
                return {label: String(item), value: item};
            });
        }

        if (attributeData.autoFill) {
            const fieldPath = attributeData.autoFill;
            const fieldData = this.getDataFromPath(fieldPath, behaviorContext);
            if (fieldData) {
                const newOptions = fieldData.map((item: any) => {
                    if (typeof item === "object" && item !== null && "label" in item && "value" in item) {
                        return item;
                    }
                    let label = item;
                    try {
                        if (typeof item === "string" && (item.startsWith("http://") || item.startsWith("https://"))) {
                            label = new URL(item, window.location.origin).pathname.split("/").pop() || item;
                        }
                    } catch {
                        label = item.split("/").pop() || item;
                    }
                    return {
                        label,
                        value: item,
                    };
                });
                if (options) {
                    options = [...options, ...newOptions];
                } else {
                    options = newOptions;
                }
            }
            options = [{label: "None", value: "none"}, ...options || []];
        }

        if (attributeData.searchFor && attributeData.searchFor.length > 0) {
            const defaultOption = this.findStringByKeywords(options, attributeData.searchFor);
            if (defaultOption) {
                defaultValue = defaultOption;
            }
        }

        if (!options || options.length === 0) {
            options = [{label: "None", value: "none"}];
        }

        if (!defaultValue) {
            defaultValue = options[0].value;
        } else {
            // check if default value is in options
            let found = false;
            for (const option of options) {
                if (option.value === defaultValue) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                defaultValue = options[0].value;
                console.warn(
                    `EnumAttributeConverter: Default value ${defaultValue} not found in options for attribute: ${attributeData.name}. Setting default to ${defaultValue}`,
                );
            }
        }

        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Enum,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            width: attributeData.width,
            default: defaultValue,
            options: options,
            order: attributeData.order || 0,
        };
    }

    // TODO: move this to a utility class and make more generic
    private findStringByKeywords(data: {label: string; value: string}[], keywords: string[]): string {
        let result = "";
        for (const item of data) {
            const lowerCaseItem = item.label.toLowerCase();
            // const lowerCaseItem = item.toLowerCase();
            for (const keyword of keywords) {
                const lowerCaseKeyword = keyword.toLowerCase();
                if (lowerCaseItem.includes(lowerCaseKeyword)) {
                    result = item.value;
                    break;
                }
            }
        }
        return result || "";
    }

    private getDataFromPath(path: string, behaviorContext: BehaviorContext): any {
        const pathParts = path.split(".");
        let data = behaviorContext;
        for (const part of pathParts) {
            data = data[part];
        }
        return data;
    }
}
export default EnumAttributeConverter;
