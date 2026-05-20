import {Object3D} from "three";

import {AssetLoader} from "@stem/editor-oss/asset-management/AssetLoader";
import { resolveAssetRevisionId, type AssetResolutionContext } from '@stem/editor-oss/asset-management/AssetResolutionContext';
import {loadModel, loadModelWithLoader} from "@stem/editor-oss/model/load-util";
import {setModelId, setModelRevisionId} from "@stem/editor-oss/model/util";
import {PhysicsUtil} from '@stem/editor-oss/physics/PhysicsUtil';
import {ModelSchema, SerializedModel} from "../schema/ModelSchema";
import {applyToObject3d, extractFromObject3d} from "../util/object3d";

export interface ModelDeserializeOptions {
    assetLoader?: AssetLoader;
}

export class ModelSerializer {
    toJSON(obj: Object3D): SerializedModel {
        const modelId = obj.userData.modelId as string | undefined | null;
        if (!modelId) {
            throw new Error("Object is not a model instance");
        }

        // Clean the userData by removing the modelId, modelRevisionId
        const userData = {
            ...obj.userData,
        };

        delete userData.modelId;
        delete userData.modelRevisionId;
        
        // Compute shape offset and scale for physics. These get stored in
        // userData so that they don't need to be re-computed at runtime
        if (PhysicsUtil.isPhysicsEnabled(obj)) {
            PhysicsUtil.updateShapeOffsetAndScale(obj);
        }

        return {
            ...extractFromObject3d(obj),
            metadata: {
                generator: this.constructor.name,
            },
            modelId,
            userData,
        };
    }

    async fromJSON(
        json: unknown,
        parent: Object3D | null,
        options: {assetResolutionContext: AssetResolutionContext; assetLoader?: AssetLoader},
    ): Promise<Object3D | null> {
        const context = options.assetResolutionContext;
        const result = ModelSchema.safeParse(json);
        if (!result.success) {
            console.warn("Failed to parse model data:", result.error);
            throw new Error("Failed to parse model data");
        }

        const {modelId} = result.data;

        // Use AssetLoader if provided for efficient caching
        let object: Object3D;
        try {
            object = options.assetLoader
                ? await loadModelWithLoader(modelId, context, options.assetLoader, { priority: 10 })
                : await loadModel(modelId, context, { priority: 10 });
        } catch (error) {
            console.warn("Failed to load model:", error);
            // If the model fails to load, create an empty object so that the
            // model remains in the scene. Otherwise, the model is not present
            // in the scene and any data associated with it is lost on the next
            // scene save.
            object = new Object3D();
            setModelId(object, modelId);
            const revisionId = resolveAssetRevisionId(modelId, context);
            if (revisionId) {
                setModelRevisionId(object, revisionId);
            }
        }

        applyToObject3d(object, result.data, context);

        return object;
    }
}
