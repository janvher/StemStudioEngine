import {BehaviorAttributeData,BehaviorAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class SeparatorAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): BehaviorAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Separator,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            array: false,
            default: attributeData.default,
            order: attributeData.order || 0,
        };
    }
}

export default SeparatorAttributeConverter;
