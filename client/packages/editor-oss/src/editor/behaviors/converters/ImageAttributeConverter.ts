import {BehaviorAttributeData,BehaviorAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class ImageAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): BehaviorAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Image,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default || "",
            order: attributeData.order || 0,
        };
    }
}

export default ImageAttributeConverter;
