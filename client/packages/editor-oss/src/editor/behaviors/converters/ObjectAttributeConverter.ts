import global from "@stem/editor-oss/global";
import {BehaviorAttributeData, ObjectAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import AttributeConverter from "./AttributeConverter";
import {BehaviorContext} from "../BehaviorContextProvider";
import {DYNAMIC_ROOT_NAME} from "@stem/editor-oss/scene/dynamicRoots";

/**
    Finds all objects in the scene and adds them to the options array
**/
class ObjectAttributeConverter implements AttributeConverter {
    /**
     * Check if an object contains any mesh (either is a mesh or has mesh children)
     * @param object
     */
    private containsMesh(object: any): boolean {
        if (object.isMesh) {
            return true;
        }
        if (object.children) {
            for (const child of object.children) {
                if (this.containsMesh(child)) {
                    return true;
                }
            }
        }
        return false;
    }

    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): ObjectAttribute {
        const app = (global as any).app;
        const editor = app.editor;
        const includeNone = attributeData.includeNone !== false;
        const excludeNames = new Set<string>(
            Array.isArray(attributeData.excludeNames)
                ? attributeData.excludeNames.map((name: string) => String(name).toLowerCase())
                : [],
        );
        const excludeSelf = attributeData.excludeSelf === true;
        const options: {name: string; uuid: string}[] = includeNone ? [{name: "none", uuid: ""}] : [];
        const filter = attributeData.filter as string | undefined;
        const seenUuids = new Set<string>();

        editor.scene.traverse((child: any) => {
            // Skip if already added (prevent duplicates)
            if (seenUuids.has(child.uuid)) {
                return;
            }

            // Skip system objects (cameras, lights, helpers, etc.)
            if (child.isCamera || child.isLight || child.isHelper) {
                return;
            }

            // Skip objects without names (likely internal/generated objects)
            if (!child.name) {
                return;
            }

            if (excludeNames.has(String(child.name).toLowerCase())) {
                return;
            }

            if (excludeSelf && behaviorContext.object && child.uuid === behaviorContext.object.uuid) {
                return;
            }

            // Skip runtime-only and internal objects
            if (child.name === DYNAMIC_ROOT_NAME || child.name === "BatchRoot" || child.userData?.isRuntimeOnly) {
                return;
            }

            // Apply filter if specified
            if (filter === "mesh") {
                // Include objects that are meshes OR contain meshes (like loaded models)
                // Also check isStemObject for known stem objects
                if (this.containsMesh(child) && (child.userData?.isStemObject || child.parent === editor.scene)) {
                    options.push({name: child.name, uuid: child.uuid});
                    seenUuids.add(child.uuid);
                }
            } else {
                // Default behavior: include stem objects and top-level groups
                if (child.userData?.isStemObject || child.isGroup || child.parent === editor.scene) {
                    options.push({name: child.name, uuid: child.uuid});
                    seenUuids.add(child.uuid);
                }
            }
        });

        // Determine the default value
        let defaultValue = attributeData.default || "";

        // If defaultToSelf is true and we have an object context, use it as default
        if (attributeData.defaultToSelf && behaviorContext.object) {
            defaultValue = behaviorContext.object.uuid;
        }

        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Object,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            options: options,
            default: defaultValue,
            order: attributeData.order || 0,
            filter: filter,
        };
    }
}

export default ObjectAttributeConverter;
