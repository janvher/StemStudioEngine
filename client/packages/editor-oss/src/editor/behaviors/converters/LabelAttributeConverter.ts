import {BehaviorAttributeData,BehaviorAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class LabelAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): BehaviorAttribute {
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
