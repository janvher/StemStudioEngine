import { Object3D } from 'three';

import { someObject } from '@stem/editor-oss/utils/SceneUtil';

export const isModelMixamoCompatible = (model: Object3D) => {
    return someObject(
        model,
        child => child.type === "Bone" && child.name.includes("mixamo"),
    );
};
