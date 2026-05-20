
/**
 * Module: SetPositionCommand.js
 * Purpose: Contains logic for set position command.
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
class SetPositionCommand extends Command {
    constructor(object, newPosition, optionalOldPosition) {
        super();
        this.editor = global.app.editor;
        this.type = "SetPositionCommand";
        this.name = t("Set Position");
        this.updatable = true;

        this.object = object;

        if (object !== undefined && newPosition !== undefined) {
            this.oldPosition = object.position.clone();
            this.newPosition = newPosition.clone();
        }

        if (optionalOldPosition !== undefined) {
            this.oldPosition = optionalOldPosition.clone();
        }
    }

    execute() {
        this.object.position.copy(this.newPosition);
        this.object.updateMatrixWorld(true);
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetPositionCommand: Position changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.position.copy(this.oldPosition);
        this.object.updateMatrixWorld(true);
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetPositionCommand: Position reverted (${this.object.name})`,
            status: "success",
        };
    }

    update(command) {
        this.newPosition.copy(command.newPosition);
    }

    toJSON() {
        var output = super.toJSON();

        output.objectUuid = this.object.uuid;
        output.oldPosition = this.oldPosition.toArray();
        output.newPosition = this.newPosition.toArray();

        return output;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.oldPosition = new THREE.Vector3().fromArray(json.oldPosition);
        this.newPosition = new THREE.Vector3().fromArray(json.newPosition);
    }
}

export {SetPositionCommand};
