
import {BufferGeometry, Material, MathUtils, Mesh, Object3D, Scene} from "three";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

import {assetRefKey} from "@stem/editor-oss/asset-management/AssetRef";
import {remapBehaviorAttributeUuids} from "@stem/editor-oss/asset-management/dependencies";
import {getModelId, getModelRevisionId, isModelAssetInstance} from "@stem/editor-oss/model/util";
import {getPrefabId, getPrefabRevisionId, isPrefab} from "@stem/editor-oss/prefab/util";
import {TemplateType} from "../types/TemplateType";

type ChildData = {
    uuid: string;
    children: ChildData[];
};

const containsSkinnedMesh = (object: Object3D): boolean => {
    if ((object as any).isSkinnedMesh) {
        return true;
    }

    for (const child of object.children) {
        if (containsSkinnedMesh(child)) {
            return true;
        }
    }

    return false;
};

const processClonedObjectRecursively = (
    sourceObject: Object3D,
    clonedObject: Object3D,
    options: CloneObjectOptions = {},
): void => {
    clonedObject.uuid = MathUtils.generateUUID();

    if (options?.uuidMap) {
        options.uuidMap.set(sourceObject.uuid, clonedObject.uuid);
    }

    // Clone materials
    if (options?.cloneMaterials) {
        const material = (sourceObject as any).material as Material | Material[];
        const cloneMaterial = (m: Material) => {
            if (options.materialCache?.has(m)) {
                return options.materialCache.get(m)!;
            }
            const cloned = m.clone();
            options.materialCache?.set(m, cloned);
            return cloned;
        };

        if (Array.isArray(material)) {
            (clonedObject as any).material = material.map(cloneMaterial);
        } else if (material) {
            (clonedObject as any).material = cloneMaterial(material);
        }
    }

    // Clone geometry
    if (options?.cloneGeometry) {
        const geometry = (sourceObject as any).geometry as BufferGeometry;
        if (geometry) {
            if (options.geometryCache?.has(geometry)) {
                (clonedObject as any).geometry = options.geometryCache.get(geometry)!;
            } else {
                const cloned = geometry.clone();
                options.geometryCache?.set(geometry, cloned);
                (clonedObject as any).geometry = cloned;
            }
        }
    }

    if (sourceObject.userData) {
        clonedObject.userData = JSON.parse(JSON.stringify(sourceObject.userData));
        processCloneBehaviors(clonedObject);
    }

    processCloneChildrenRecursively(sourceObject, clonedObject, options);
};

const processCloneBehaviors = (clonedObject: Object3D): void => {
    if (!clonedObject.userData.behaviors) {
        return;
    }

    clonedObject.userData.behaviors = clonedObject.userData.behaviors.map((behavior: any) => ({
        ...behavior,
        uuid: MathUtils.generateUUID(),
    }));
};

const processCloneChildrenRecursively = (
    sourceObject: Object3D,
    clonedObject: Object3D,
    options: CloneObjectOptions = {},
): void => {
    sourceObject.children.map((sourceChild, index) => {
        const clonedChild = clonedObject.children[index];
        if (!clonedChild) {
            return;
        }
        processClonedObjectRecursively(sourceChild, clonedChild, options);
    });
};

type CloneObjectOptions = {
    uuidMap?: Map<string, string>;
    cloneMaterials?: boolean;
    cloneGeometry?: boolean;
    materialCache?: WeakMap<Material, Material>;
    geometryCache?: WeakMap<BufferGeometry, BufferGeometry>;
};

/**
 * Clone the object, its children and its behaviors.
 *
 * @param object - The object to clone
 * @param options - Options
 * @returns The cloned object.
 */
export const cloneObject = (object: Object3D, options: CloneObjectOptions = {}): Object3D => {
    const internalOptions = { ...options };
    if (internalOptions.cloneMaterials && !internalOptions.materialCache) {
        internalOptions.materialCache = new Map();
    }
    if (internalOptions.cloneGeometry && !internalOptions.geometryCache) {
        internalOptions.geometryCache = new Map();
    }
    // Use provided uuidMap or create an internal one for remapping
    const uuidMap = internalOptions.uuidMap || new Map<string, string>();
    internalOptions.uuidMap = uuidMap;

    // Check if the object or its children contain skinned meshes
    const clonedObject = containsSkinnedMesh(object) ? SkeletonUtils.clone(object) : object.clone(true);

    processClonedObjectRecursively(object, clonedObject, internalOptions);

    // Remap "object" type behavior attributes to use the new UUIDs
    remapBehaviorAttributeUuids(clonedObject, internalOptions.uuidMap);

    processChildData(clonedObject);

    // Preserve the _obj property, which stores things like animations.
    // TODO: should we clone this data instead of referencing it?
    // TODO: our objects also have a _root property, but I'm not sure if it
    // makes sense to clone / reference that.
    (clonedObject as any)._obj = (object as any)._obj;
    (clonedObject as any)._root = (object as any)._root;

    return clonedObject;
};

export const processChildData = (clonedObject: Object3D, initial?: boolean): void => {
    if (!clonedObject.userData.children && !initial) {
        return;
    }

    clonedObject.userData.children = [];
    const saveChildrenData = (obj: Object3D, childrenList: ChildData[]) => {
        if (obj.userData.Server === true || obj.userData.isRuntimeOnly) return;
        if (obj.children && obj.userData?.type === undefined) {
            obj.children.forEach(n => {
                let children1: ChildData[] = [];
                childrenList.push({
                    uuid: n.uuid,
                    children: children1,
                });
                saveChildrenData(n, children1);
            });
        }
    };
    saveChildrenData(clonedObject, clonedObject.userData.children);
};

export const getObjectTemplateType = (object: Object3D): TemplateType | undefined => {
    if (object.userData.templateType) {
        return object.userData.templateType as TemplateType;
    }

    if (isPrefab(object)) {
        return TemplateType.PREFAB_ASSET;
    }

    if (isModelAssetInstance(object)) {
        return TemplateType.MODEL_ASSET;
    }

    return undefined;
};

export const getObjectTemplate = (object: Object3D): string | undefined => {
    if (object.userData.template) {
        return object.userData.template as string;
    }

    const prefabId = getPrefabId(object);
    if (prefabId) {
        const revisionId = getPrefabRevisionId(object);
        if (!revisionId) {
            console.warn(`Prefab revision not found for ${prefabId}`);
            return undefined;
        }

        return assetRefKey({assetId: prefabId, revisionId});
    }

    const modelId = getModelId(object);
    if (modelId) {
        const revisionId = getModelRevisionId(object);
        if (!revisionId) {
            console.warn(`Model revision not found for ${modelId}`);
            return undefined;
        }

        return assetRefKey({assetId: modelId, revisionId});
    }

    return undefined;
};

export const setObjectTemplate = (object: Object3D, templateType: TemplateType, template: string) => {
    object.userData.templateType = templateType;
    object.userData.template = template;
};

export const getObjectTemplateFromScene = (object: Object3D, scene: Scene): Object3D | undefined => {
    const templateType = getObjectTemplateType(object);
    if (templateType !== TemplateType.UUID) {
        return undefined;
    }

    const templateUuid = getObjectTemplate(object);
    if (!templateUuid) {
        return undefined;
    }

    return scene.getObjectByProperty("uuid", templateUuid);
};

export const getVertexCount = (object: Object3D): number => {
    let count = 0;

    object.traverse(child => {
        if (child instanceof Mesh && child.isMesh) {
            if (child.geometry instanceof BufferGeometry) {
                if (child.geometry.index) {
                    count += child.geometry.index.count;
                } else {
                    const position = child.geometry.getAttribute("position");
                    if (position) {
                        count += position.count;
                    }
                }
            }
        }
    });

    return count;
};
