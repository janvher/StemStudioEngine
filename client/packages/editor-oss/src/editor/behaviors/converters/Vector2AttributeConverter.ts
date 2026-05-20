import {BehaviorAttributeData, Vector2Attribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class Vector2AttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): Vector2Attribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Vector2,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: this.toVec2(attributeData.default) || {x: 0, y: 0},
            min: this.toVec2(attributeData.min),
            max: this.toVec2(attributeData.max),
            order: attributeData.order || 0,
        };
    }

    private toVec2(value: any): {x: number; y: number} | undefined {
        if (Array.isArray(value)) {
            return {x: value[0] ?? 0, y: value[1] ?? 0};
        }
        if (value && (value.x !== undefined || value.y !== undefined)) {
            return {x: value.x ?? 0, y: value.y ?? 0};
        }
        return undefined;
    }
}

export default Vector2AttributeConverter;
