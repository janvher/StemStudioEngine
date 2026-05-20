import {BehaviorAttributeData, BehaviorAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import AttributeConverter from "./AttributeConverter";

class ModelPreviewAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData): BehaviorAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.ModelPreview,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default || "",
            order: attributeData.order || 0,
            size: attributeData.size || 64,
            urlField: attributeData.urlField,
            uuidField: attributeData.uuidField,
        };
    }
}

export default ModelPreviewAttributeConverter;
