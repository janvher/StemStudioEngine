import {BehaviorAttributeData,BehaviorAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import AttributeConverter from "./AttributeConverter";

class LabelAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData): BehaviorAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Label,
            array: false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default,
            order: attributeData.order || 0,
        };
    }
}

export default LabelAttributeConverter;
