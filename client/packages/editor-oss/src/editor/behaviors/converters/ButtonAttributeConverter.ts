import { BehaviorAttributeData, ButtonAttribute } from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import { BehaviorContext } from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class ButtonAttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): ButtonAttribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Button,
            array: false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: attributeData.default,
            order: attributeData.order || 0,
            action: attributeData.action || 'buttonClicked',
            buttonText: attributeData.buttonText,
        };
    }
}

export default ButtonAttributeConverter;
