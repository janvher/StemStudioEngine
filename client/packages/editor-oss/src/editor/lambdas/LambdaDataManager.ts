import {Object3D} from "three";

import LambdaDataFactory from "./LambdaDataFactory";
import type {LambdaComponentData} from "../../lambdas/Lambda";

class LambdaDataManager {
    createLambdaComponentData(
        lambdaId: string,
        instanceId: string,
        componentSchema?: Record<string, any>,
        customUUID?: string,
    ): LambdaComponentData {
        return LambdaDataFactory.createData(lambdaId, instanceId, componentSchema, customUUID);
    }

    addLambdaComponentToObject(object: Object3D, data: LambdaComponentData): boolean {
        if (!object.userData) {
            object.userData = {};
        }
        if (!object.userData.lambdaComponents) {
            object.userData.lambdaComponents = [];
        }

        object.userData.lambdaComponents.push(data);
        return true;
    }

    removeLambdaComponentFromObject(object: Object3D, uuid: string): LambdaComponentData | null {
        const components = object.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) return null;

        const index = components.findIndex(c => c.uuid === uuid);
        if (index === -1) return null;

        const [removed] = components.splice(index, 1);
        return removed ?? null;
    }

    getLambdaComponentByUUID(object: Object3D, uuid: string): LambdaComponentData | null {
        const components = object.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) return null;
        return components.find(c => c.uuid === uuid) ?? null;
    }

    getLambdaComponentsByInstanceId(object: Object3D, instanceId: string): LambdaComponentData[] {
        const components = object.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) return [];
        return components.filter(c => c.instanceId === instanceId);
    }

    updateLambdaComponentData(
        object: Object3D,
        uuid: string,
        newComponentData: Record<string, any>,
    ): boolean {
        const component = this.getLambdaComponentByUUID(object, uuid);
        if (!component) return false;

        component.componentData = {...component.componentData, ...newComponentData};
        return true;
    }
}

export default LambdaDataManager;
