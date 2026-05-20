import {BehaviorAttributeData, Vector2Attribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import AttributeConverter from "./AttributeConverter";

class Vector2AttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData): Vector2Attribute {
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

    private toVec2(value: unknown): {x: number; y: number} | undefined {
        if (Array.isArray(value)) {
            return {x: value[0] ?? 0, y: value[1] ?? 0};
        }
        if (value && typeof value === "object") {
            const v = value as {x?: number; y?: number};
            if (v.x !== undefined || v.y !== undefined) {
                return {x: v.x ?? 0, y: v.y ?? 0};
            }
        }
        return undefined;
    }
}

export default Vector2AttributeConverter;
