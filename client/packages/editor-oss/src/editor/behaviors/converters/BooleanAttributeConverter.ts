import {BehaviorAttributeData,BooleanAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class BooleanAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): BooleanAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Boolean,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default || false,
            order: attributeData.order || 0,
        };
    }
}

export default BooleanAttributeConverter;
