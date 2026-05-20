import {BehaviorAttributeData, BehaviorAttribute} from "../BehaviorAttributes";
import { BehaviorContext } from "../BehaviorContextProvider";

interface AttributeConverter {
	convertAttribute(attributeData:BehaviorAttributeData, behaviorContext:BehaviorContext): BehaviorAttribute;
}

export default AttributeConverter;
