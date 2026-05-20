import global from "@stem/editor-oss/global";
import {BehaviorAttributeData, ObjectAttribute} from "../BehaviorAttributes";
import BehaviorAttributeType from "../BehaviorAttributeType";
import AttributeConverter from "./AttributeConverter";
import {BehaviorContext} from "../BehaviorContextProvider";

class ChildrenAttributeConverter implements AttributeConverter {
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

    private isBoneNode(object: any): boolean {
        return object?.isBone || object?.type === "Bone";
    }

    private isHiddenNode(object: any): boolean {
        if (!object?.userData?.isStemObject) {
            return true;
        }

        let current = object;
        while (current) {
            if (current.visible === false) {
                return true;
            }
            current = current.parent;
        }
        return false;
    }

    convertAttribute(attributeData: BehaviorAttributeData, behaviorContext: BehaviorContext): ObjectAttribute {
        const app = (global as any).app;
        const editor = app.editor;
        const options: {name: string; uuid: string}[] = [];
        const filter = attributeData.filter as string | undefined;
        const seenUuids = new Set<string>();

        const rootObject = behaviorContext.object
            ? editor.scene.getObjectByProperty("uuid", behaviorContext.object.uuid)
            : null;

        if (rootObject) {
            rootObject.traverse((child: any) => {
                if (child.uuid === rootObject.uuid || seenUuids.has(child.uuid)) {
                    return;
                }

                if (filter === "mesh" && !this.containsMesh(child)) {
                    return;
                }

                const baseName = child.name || `${child.type || "Object3D"} (${child.uuid.slice(0, 8)})`;
                const flags: string[] = [];
                if (this.isBoneNode(child)) {
                    flags.push("Bone");
                }
                if (this.isHiddenNode(child)) {
                    flags.push("Hidden");
                }

                const label = flags.length > 0 ? `[${flags.join("][")}] ${baseName}` : baseName;
                options.push({name: label, uuid: child.uuid});
                seenUuids.add(child.uuid);
            });
        }

        let defaultValue = attributeData.default || "";

        if (attributeData.defaultToSelf && behaviorContext.object) {
            defaultValue = behaviorContext.object.uuid;
        }

        return {
            name: attributeData.name,
            type: BehaviorAttributeType.Children,
            array: attributeData.array || false,
            invisible: attributeData.invisible || false,
            visibleIf: attributeData.visibleIf,
            options,
            default: defaultValue,
            order: attributeData.order || 0,
            filter,
        };
    }
}

export default ChildrenAttributeConverter;