import {BehaviorAttributeData, Vector3Attribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import {BehaviorContext} from "../BehaviorContextProvider";
import AttributeConverter from "./AttributeConverter";

class Vector3AttributeConverter implements AttributeConverter {
    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): Vector3Attribute {
        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Vector3,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            default: this.toVec3(attributeData.default) || {x: 0, y: 0, z: 0},
            min: this.toVec3(attributeData.min),
            max: this.toVec3(attributeData.max),
            order: attributeData.order || 0,
        };
    }

    private toVec3(value: any): {x: number; y: number; z: number} | undefined {
        if (Array.isArray(value)) {
            return {x: value[0] ?? 0, y: value[1] ?? 0, z: value[2] ?? 0};
        }
        
        if (value && (value.x !== undefined || value.y !== undefined || value.z !== undefined)) {
            return {x: value.x ?? 0, y: value.y ?? 0, z: value.z ?? 0};
        }

        return undefined;
    }
}

export default Vector3AttributeConverter;
