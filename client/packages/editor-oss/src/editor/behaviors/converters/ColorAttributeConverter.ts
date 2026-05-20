import {BehaviorAttributeData, StringAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class ColorAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): StringAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Color,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default || "#ffffff",
            readOnly: attributeData.readOnly || false,
            order: attributeData.order || 0,
        };
    }
}

export default ColorAttributeConverter;
