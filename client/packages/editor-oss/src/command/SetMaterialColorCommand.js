
/**
 * Module: SetMaterialColorCommand.js
 * Purpose: Contains logic for set material color command.
 */


import {t} from "i18next";
import * as THREE from "three";

import Command from "./Command";
import global from "../global";

let color = new THREE.Color();

/**
 *
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 *
 *
 * @param {String} newValue integer representing a hex color value or a hex string startsWith `#`
 * @constructor
 */
class SetMaterialColorCommand extends Command {
    constructor(object, attributeName, newValue) {
        super();
        this.editor = global.app.editor;
        this.type = "SetMaterialColorCommand";
        this.name = t("Set Material") + "." + attributeName;
        this.updatable = true;

        this.object = object;
        this.attributeName = attributeName;
        this.oldValue = object !== undefined ? this.object.material[this.attributeName].getHex() : undefined;

        if (Number.isInteger(newValue)) {
            this.newValue = newValue;
        } else {
            // #ffffff
            color.set(newValue);
            this.newValue = color.getHex();
        }
    }

    execute() {
        this.object.material[this.attributeName].setHex(this.newValue);
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialColorCommand: Material color changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.material[this.attributeName].setHex(this.oldValue);
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialColorCommand: Material color reverted (${this.object.name})`,
            status: "success",
        };
    }

    update(cmd) {
        this.newValue = cmd.newValue;
    }

    toJSON() {
        var output = Command.prototype.toJSON.call(this);

        output.objectUuid = this.object.uuid;
        output.attributeName = this.attributeName;
        output.oldValue = this.oldValue;
        output.newValue = this.newValue;

        return output;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.attributeName = json.attributeName;
        this.oldValue = json.oldValue;
        this.newValue = json.newValue;
    }
}

Object.assign(SetMaterialColorCommand.prototype, {
    constructor: SetMaterialColorCommand,

    execute: function () {
        this.object.material[this.attributeName].setHex(this.newValue);
    },

    undo: function () {
        this.object.material[this.attributeName].setHex(this.oldValue);
    },

    update: function (cmd) {
        this.newValue = cmd.newValue;
    },

    toJSON: function () {
        var output = Command.prototype.toJSON.call(this);

        output.objectUuid = this.object.uuid;
        output.attributeName = this.attributeName;
        output.oldValue = this.oldValue;
        output.newValue = this.newValue;

        return output;
    },

    fromJSON: function (json) {
        Command.prototype.fromJSON.call(this, json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.attributeName = json.attributeName;
        this.oldValue = json.oldValue;
        this.newValue = json.newValue;
    },
});

export {SetMaterialColorCommand};
