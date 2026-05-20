import {t} from "i18next";
import * as THREE from "three";

import Command from "./Command";
import global from "../global";

// TODO: refactor, DRY
class MoveObjectCommand extends Command {
    constructor(object, newParent, newBefore, keepLocalSpace = false) {
        super();
        this.type = "MoveObjectCommand";
        this.name = t("Move Object");

        this.object = object;
        this.oldParent = object?.parent || null;
        this.oldIndex = this.oldParent ? this.oldParent.children.indexOf(this.object) : null;
        this.newParent = newParent || null;

        if (newBefore != null) {
            const beforeIndex = this.newParent ? this.newParent.children.indexOf(newBefore) : null;
            this.newIndex = beforeIndex != null && beforeIndex !== -1 ? beforeIndex : this.newParent?.children.length ?? null;
        } else {
            this.newIndex = this.newParent ? this.newParent.children.length : null;
        }

        if (this.oldParent === this.newParent && this.newIndex > this.oldIndex) {
            this.newIndex--;
        }

        this.newBefore = newBefore;
        this.keepLocalSpace = keepLocalSpace;
        this.editor = global.app.editor;
    }

    isProtectedObject(object) {
        return !!this.editor && (object === this.editor.scene || object === this.editor.camera);
    }

    wouldCreateCycle() {
        let parent = this.newParent;

        while (parent) {
            if (parent === this.object) {
                return true;
            }

            parent = parent.parent;
        }

        return false;
    }

    execute() {
        if (this.isProtectedObject(this.object) || this.wouldCreateCycle()) {
            console.warn("MoveObjectCommand: blocked invalid move", this.object?.name);
            return {
                message: `MoveObjectCommand: Move object blocked (${this.object?.name || "unknown"})`,
                status: "error",
            };
        }

        if (this.newParent) {
            const transform = this.keepLocalSpace ? null : this.getObjectTransform(this.object);

            if (this.oldParent) {
                this.oldParent.remove(this.object);
            }

            var children = this.newParent.children;
            children.splice(this.newIndex, 0, this.object);
            this.object.parent = this.newParent;

            if (transform) {
                this.setObjectTransform(this.object, transform);
            }

        } else if (this.oldParent) {
            const transform = this.keepLocalSpace ? null : this.getObjectTransform(this.object);

            var children = this.oldParent.children;
            children.splice(this.oldIndex, 1); // Remove from old position
            children.splice(this.newIndex, 0, this.object); // Insert at new position
            this.object.parent = this.oldParent;

            if (transform) {
                this.setObjectTransform(this.object, transform);
            }
        } else {
            console.log("No new or old parent");
            return {
                message: `MoveObjectCommand: Move object failed (${this.object.name})`,
                status: "error",
            };
        }

        global.app?.call("objectChanged", this, this.object);
        return {
            message: `MoveObjectCommand: Object moved (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        if (this.oldParent) {
            const transform = this.keepLocalSpace ? null : this.getObjectTransform(this.object);

            if (this.newParent) {
                this.newParent.remove(this.object);
            }

            var children = this.oldParent.children;
            children.splice(this.oldIndex, 0, this.object);
            this.object.parent = this.oldParent;

            if (transform) {
                this.setObjectTransform(this.object, transform);
            }

        } else if (this.newParent) {
            const transform = this.keepLocalSpace ? null : this.getObjectTransform(this.object);

            var children = this.newParent.children;
            children.splice(this.newIndex, 1); // Remove from new position
            children.splice(this.oldIndex, 0, this.object); // Insert at old position
            this.object.parent = this.newParent;

            if (transform) {
                this.setObjectTransform(this.object, transform);
            }
        }

        global.app?.call("objectChanged", this, this.object);
        return {
            message: `MoveObjectCommand: Move undone (${this.object.name})`,
            status: "success",
        };
    }

    getObjectTransform(object) {
        this.object.updateWorldMatrix(true, false);

        return {
            position: object.getWorldPosition(new THREE.Vector3()),
            quaternion: object.getWorldQuaternion(new THREE.Quaternion()),
            scale: object.getWorldScale(new THREE.Vector3()),
        };
    }

    setObjectTransform(object, transform) {
        // Convert world coordinates to local coordinates of the new parent
        const parentMatrixInverse = new THREE.Matrix4().copy(object.parent.matrixWorld).invert();

        // Position
        const localPosition = transform.position.clone().applyMatrix4(parentMatrixInverse);
        object.position.copy(localPosition);

        // Rotation
        const parentQuaternionInverse = object.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
        const localQuaternion = transform.quaternion.clone().premultiply(parentQuaternionInverse);
        object.quaternion.copy(localQuaternion);

        // Scale
        const parentScale = object.parent.getWorldScale(new THREE.Vector3());
        const localScale = transform.scale.clone().divide(parentScale);
        object.scale.copy(localScale);

        object.updateWorldMatrix(true, false);
    }

    toJSON() {
        var output = Command.prototype.toJSON.call(this);

        output.objectUuid = this.object.uuid;
        output.newParentUuid = this.newParent ? this.newParent.uuid : null;
        output.oldParentUuid = this.oldParent ? this.oldParent.uuid : null;
        output.newIndex = this.newIndex;
        output.oldIndex = this.oldIndex;
        output.keepLocalSpace = this.keepLocalSpace;

        return output;
    }

    fromJSON(json) {
        Command.prototype.fromJSON.call(this, json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.oldParent = this.editor.objectByUuid(json.oldParentUuid) || this.editor.scene;
        this.newParent = this.editor.objectByUuid(json.newParentUuid) || this.editor.scene;
        this.newIndex = json.newIndex;
        this.oldIndex = json.oldIndex;
        this.keepLocalSpace = json.keepLocalSpace ?? false;
    }
}

export {MoveObjectCommand};
