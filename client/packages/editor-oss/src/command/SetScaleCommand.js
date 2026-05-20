
/**
 * Module: SetScaleCommand.js
 * Purpose: Contains logic for set scale command.
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
class SetScaleCommand extends Command {
    constructor(object, newScale, optionalOldScale) {
        super();
        this.editor = global.app.editor;
        this.type = "SetScaleCommand";
        this.name = t("Set Scale");
        this.updatable = true;

        this.object = object;

        if (object !== undefined && newScale !== undefined) {
            this.oldScale = object.scale.clone();
            this.newScale = newScale.clone();
        }

        if (optionalOldScale !== undefined) {
            this.oldScale = optionalOldScale.clone();
        }
    }

    execute() {
        this.object.scale.copy(this.newScale);
        this.object.updateMatrixWorld(true);
        global.app.call("objectChanged", this, this.object);

        return {
            message: `SetScaleCommand: Scale changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.scale.copy(this.oldScale);
        this.object.updateMatrixWorld(true);
        global.app.call("objectChanged", this, this.object);

        return {
            message: `SetScaleCommand: Scale reverted (${this.object.name})`,
            status: "success",
        };
    }

    update(command) {
        this.newScale.copy(command.newScale);
    }

    toJSON() {
        var output = super.toJSON();

        output.objectUuid = this.object.uuid;
        output.oldScale = this.oldScale.toArray();
        output.newScale = this.newScale.toArray();

        return output;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.oldScale = new THREE.Vector3().fromArray(json.oldScale);
        this.newScale = new THREE.Vector3().fromArray(json.newScale);
    }
}

export {SetScaleCommand};
