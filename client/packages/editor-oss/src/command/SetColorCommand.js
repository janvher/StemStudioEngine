
/**
 * Module: SetColorCommand.js
 * Purpose: Contains logic for set color command.
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
class SetColorCommand extends Command {
    constructor(object, attributeName, newValue) {
        super();
        this.type = "SetColorCommand";
        this.name = t("Set") + " " + attributeName;
        this.updatable = true;

        this.object = object;
        this.attributeName = attributeName;
        this.oldValue = object !== undefined ? this.object[this.attributeName].getHex() : undefined;
        this.newValue = newValue;
        this.editor = global.app.editor;
    }

    execute() {
        this.object[this.attributeName].setHex(this.newValue);
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetColorCommand: Color changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object[this.attributeName].setHex(this.oldValue);
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetColorCommand: Color reverted (${this.object.name})`,
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

export {SetColorCommand};
