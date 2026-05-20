import {BehaviorAttributeData, StringAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class StringAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): StringAttribute {
        let defaultValue = attributeData.default;

        if (attributeData.autoFill) {
            const fieldPath = attributeData.autoFill;
            const fieldData = this.getDataFromPath(fieldPath, behaviorContext);

            if (typeof fieldData === "string") {
                defaultValue = fieldData;
            } else if (Array.isArray(fieldData)) {
                // Choose a random value from the array
                defaultValue = fieldData[Math.floor(Math.random() * fieldData.length)];
            } else if (fieldData instanceof Function) {
                defaultValue = fieldData();
            }
        }

        const isColumnMultiline = this.getColumnMultilineStatus(attributeData);

        return {
            name: attributeData.name,
            type: BehaviorAttributeType.String,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: defaultValue || "",
            isColumnMultiline,
            readOnly: attributeData.readOnly || false,
            order: attributeData.order || 0,
        };
    }

    private getColumnMultilineStatus(attributeData: BehaviorAttributeData): boolean {
        return attributeData.isColumnMultiline || false;
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

export default StringAttributeConverter;
