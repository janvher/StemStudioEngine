import {MathUtils} from "three";

import type {LambdaComponentData, LambdaConfig} from "../../lambdas/Lambda";

class LambdaDataFactory {
    static createData(
        lambdaId: string,
        instanceId: string,
        componentSchema?: Record<string, any>,
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

    static getDefaultsFromSchema(componentSchema?: Record<string, any>): Record<string, any> {
        if (!componentSchema) return {};

        const defaults: Record<string, any> = {};
        for (const [key, schema] of Object.entries(componentSchema)) {
            if (schema && typeof schema === "object" && "default" in schema) {
                defaults[key] = schema.default;
            }
        }
        return defaults;
    }
}

export default LambdaDataFactory;
