
/**
 * Module: SetGeometryValueCommand.js
 * Purpose: Contains logic for set geometry value command.
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
 * @param {Object} newValue number, string, boolean or object
 * @constructor
 */
class SetGeometryValueCommand extends Command {
    constructor(object, attributeName, newValue) {
        super();
        this.type = "SetGeometryValueCommand";
        this.name = t("Set Geometry") + "." + attributeName;

        this.object = object;
        this.attributeName = attributeName;
        this.oldValue = object !== undefined ? object.geometry[attributeName] : undefined;
        this.newValue = newValue;
        this.editor = global.app.editor;
    }

    execute() {
        this.object.geometry[this.attributeName] = this.newValue;
        global.app.call("objectChanged", this, this.object);
        global.app.call("geometryChanged", this);

        return {
            message: `SetGeometryValueCommand: Geometry value changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.geometry[this.attributeName] = this.oldValue;
        global.app.call("objectChanged", this, this.object);
        global.app.call("geometryChanged", this);
        return {
            message: `SetGeometryValueCommand: Geometry value reverted (${this.object.name})`,
            status: "success",
        };
    }

    toJSON() {
        var output = super.toJSON();

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

export {SetGeometryValueCommand};
