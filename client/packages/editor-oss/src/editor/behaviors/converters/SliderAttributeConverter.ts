import {BehaviorAttributeData,SliderAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class SliderAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): SliderAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Slider,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default || 0,
            min: attributeData.min,
            max: attributeData.max,
            step: attributeData.step,
            order: attributeData.order || 0,
        };
    }
}

export default SliderAttributeConverter;
