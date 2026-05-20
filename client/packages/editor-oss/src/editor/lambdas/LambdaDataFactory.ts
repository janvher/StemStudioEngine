import {MathUtils} from "three";

import type {LambdaComponentData, LambdaFieldConfig} from "../../lambdas/Lambda";

class LambdaDataFactory {
    static createData(
        lambdaId: string,
        instanceId: string,
        componentSchema?: Record<string, LambdaFieldConfig>,
        customUUID?: string,
    ): LambdaComponentData {
        return {
            lambdaId,
            instanceId,
            uuid: customUUID || MathUtils.generateUUID(),
            enabled: true,
            autoApply: false,
            componentData: LambdaDataFactory.getDefaultsFromSchema(componentSchema),
        };
    }

    static getDefaultsFromSchema(componentSchema?: Record<string, LambdaFieldConfig>): Record<string, unknown> {
        if (!componentSchema) return {};

        const defaults: Record<string, unknown> = {};
        for (const [key, schema] of Object.entries(componentSchema)) {
            if (schema && typeof schema === "object" && "default" in schema) {
                defaults[key] = schema.default;
            }
        }
        return defaults;
    }
}

export default LambdaDataFactory;
