import {MathUtils} from "three";

import AttributeUtil from "./AttributeUtil";
import {BehaviorAttributes} from "./BehaviorAttributes";
import {BehaviorThrottleConfig} from "../../behaviors/Behavior";
import BehaviorData from "../../behaviors/BehaviorData";


class BehaviorDataFactory {
    public static createData(
        id: string,
        attributes: BehaviorAttributes,
        priority?: number,
        throttleConfig?: BehaviorThrottleConfig,
        customUUID?: string,
    ): BehaviorData {
        const behaviorData: BehaviorData = {
            id: id,
            uuid: customUUID || MathUtils.generateUUID(),
            priority: priority ?? 0,
            enabled: true,
            attributesData: this.getAttributesData(attributes),
            throttleConfig: throttleConfig,
        };

        return behaviorData;
    }

    static getAttributesData(attributes: BehaviorAttributes): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, attr] of Object.entries(attributes)) {
            result[key] = AttributeUtil.getDefaultValueForAttribute(attr);
        }

        return result;
    }
}

export default BehaviorDataFactory;
