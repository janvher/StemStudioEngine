import { Object3D } from 'three';

export const getModelId = (object: Object3D): string | null => {
    if (object.userData?.modelId) {
        return object.userData.modelId as string;
    }
    return null;
};

export const setModelId = (object: Object3D, modelId: string | null) => {
    if (!modelId) {
        delete object.userData.modelId;
        delete object.userData.isStemObject;
    } else {
        object.userData.modelId = modelId;
        object.userData.isStemObject = true;
    }
};

export const getModelRevisionId = (object: Object3D): string | null => {
    if (object.userData?.modelRevisionId) {
        return object.userData.modelRevisionId as string;
    }
    return null;
};

export const setModelRevisionId = (object: Object3D, revisionId: string | null) => {
    if (!revisionId) {
        delete object.userData.modelRevisionId;
    } else {
        object.userData.modelRevisionId = revisionId;
    }
};

export const isModelAssetInstance = (object: Object3D): boolean => {
    return Boolean(getModelId(object));
};
