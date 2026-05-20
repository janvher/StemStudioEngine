
/**
 * Module: SetRotationCommand.js
 * Purpose: Contains logic for set rotation command.
 */


import {t} from "i18next";
import * as THREE from "three";

import Command from "./Command";
import global from "../global";

/**
 *
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 *
 *
 *
 * @constructor
 */
class SetRotationCommand extends Command {
    constructor(object, newRotation, optionalOldRotation) {
        super();
        this.editor = global.app.editor;
        this.type = "SetRotationCommand";
        this.name = t("Set Rotation");
        this.updatable = true;

        this.object = object;

        if (object !== undefined && newRotation !== undefined) {
            this.oldRotation = object.rotation.clone();
            this.newRotation = newRotation.clone();
        }

        if (optionalOldRotation !== undefined) {
            this.oldRotation = optionalOldRotation.clone();
        }
    }

    execute() {
        this.object.rotation.copy(this.newRotation);
        this.object.updateMatrixWorld(true);
        global.app.call("objectChanged", this, this.object);

        return {
            message: `SetRotationCommand: Rotation changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.rotation.copy(this.oldRotation);
        this.object.updateMatrixWorld(true);
        global.app.call("objectChanged", this, this.object);

        return {
            message: `SetRotationCommand: Rotation reverted (${this.object.name})`,
            status: "success",
        };
    }

    update(command) {
        this.newRotation.copy(command.newRotation);
    }

    toJSON() {
        var output = Command.prototype.toJSON.call(this);

        output.objectUuid = this.object.uuid;
        output.oldRotation = this.oldRotation.toArray();
        output.newRotation = this.newRotation.toArray();

        return output;
    }

    fromJSON(json) {
        Command.prototype.fromJSON.call(this, json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.oldRotation = new THREE.Euler().fromArray(json.oldRotation);
        this.newRotation = new THREE.Euler().fromArray(json.newRotation);
    }
}

export {SetRotationCommand};
