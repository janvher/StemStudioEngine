import {BehaviorAttributeData,NumberAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import AttributeConverter from "./AttributeConverter";

class NumberAttributeConverter implements AttributeConverter {
    constructor() {}

    convertAttribute(attributeData: BehaviorAttributeData): NumberAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Number,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default || 0,
            min: attributeData.min,
            max: attributeData.max,
            order: attributeData.order || 0,
        };
    }
}
export default NumberAttributeConverter;
