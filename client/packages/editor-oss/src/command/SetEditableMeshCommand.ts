import {t} from "i18next";
import * as THREE from "three";

import Command from "./Command";
import {MeshData} from "../editor/cad/MeshData";
import {SerializedMeshData} from "../editor/cad/types";
import global from "../global";

class SetEditableMeshCommand extends Command {
    object: THREE.Mesh;
    oldGeometry: THREE.BufferGeometry;
    newGeometry: THREE.BufferGeometry;
    oldMeshData: SerializedMeshData | null;
    newMeshData: SerializedMeshData;
    editor: any;

    constructor(
        object: THREE.Mesh,
        newGeometry: THREE.BufferGeometry,
        newMeshData: MeshData | SerializedMeshData,
        oldGeometry?: THREE.BufferGeometry,
        oldMeshData?: SerializedMeshData | null,
    ) {
        super();
        this.type = "SetEditableMeshCommand";
        this.name = t("Set Editable Mesh");
        this.updatable = true;

        this.object = object;
        this.oldGeometry = oldGeometry || object.geometry;
        this.newGeometry = newGeometry;
        this.oldMeshData =
            oldMeshData !== undefined ? structuredClone(oldMeshData) : object.userData.meshData ? structuredClone(object.userData.meshData) : null;
        this.newMeshData = newMeshData instanceof MeshData ? newMeshData.toJSON() : structuredClone(newMeshData);
        this.editor = global.app?.editor;
    }

    private isLockedByOtherUser(): boolean {
        const selectedBy = this.object.userData?.selectedBy;
        return !!selectedBy && selectedBy !== global.app?.userId;
    }

    execute() {
        if (this.isLockedByOtherUser()) {
            return {
                message: `SetEditableMeshCommand: Object "${this.object.name}" is locked by another user`,
                status: "error",
            };
        }

        this.object.geometry.dispose();
        this.object.geometry = this.newGeometry;
        this.object.geometry.computeBoundingSphere();
        this.object.userData.meshData = structuredClone(this.newMeshData);

        global.app?.call("geometryChanged", this, this.object);
        global.app?.call("objectChanged", this, this.object);

        return {
            message: `SetEditableMeshCommand: Editable mesh changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        if (this.isLockedByOtherUser()) {
            return {
                message: `SetEditableMeshCommand: Object "${this.object.name}" is locked by another user`,
                status: "error",
            };
        }

        this.object.geometry.dispose();
        this.object.geometry = this.oldGeometry;
        this.object.geometry.computeBoundingSphere();

        if (this.oldMeshData) {
            this.object.userData.meshData = structuredClone(this.oldMeshData);
        } else {
            delete this.object.userData.meshData;
        }

        global.app?.call("geometryChanged", this, this.object);
        global.app?.call("objectChanged", this, this.object);

        return {
            message: `SetEditableMeshCommand: Editable mesh reverted (${this.object.name})`,
            status: "success",
        };
    }

    update(cmd: SetEditableMeshCommand) {
        this.newGeometry = cmd.newGeometry;
        this.newMeshData = structuredClone(cmd.newMeshData);
    }

    toJSON() {
        const output = Command.prototype.toJSON.call(this) as any;
        output.objectUuid = this.object.uuid;
        output.oldGeometry = this.oldGeometry.toJSON();
        output.newGeometry = this.newGeometry.toJSON();
        output.oldMeshData = this.oldMeshData;
        output.newMeshData = this.newMeshData;
        return output;
    }

    fromJSON(json: any) {
        Command.prototype.fromJSON.call(this, json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.oldGeometry = parseGeometry(json.oldGeometry);
        this.newGeometry = parseGeometry(json.newGeometry);
        this.oldMeshData = json.oldMeshData || null;
        this.newMeshData = json.newMeshData;

        /**
         *
         * @param data
         */
        function parseGeometry(data: any): THREE.BufferGeometry {
            const loader = new THREE.ObjectLoader();
            return loader.parseGeometries([data])[data.uuid] as THREE.BufferGeometry;
        }
    }
}

export {SetEditableMeshCommand};
