
/**
 * Module: SetValueCommand.js
 * Purpose: Contains logic for set value command.
 */


import {t} from "i18next";

import Command from "./Command";
import global from "../global";

/**
 *
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 *
 *
 * @param {String} newValue number, string, boolean or object
 * @constructor
 */
class SetValueCommand extends Command {
    constructor(object, attributeName, newValue) {
        super();
        this.editor = global.app.editor;
        this.type = "SetValueCommand";
        this.name = t("Set") + " " + attributeName;
        this.updatable = true;

        this.object = object;
        this.attributeName = attributeName;
        this.oldValue = object !== undefined ? object[attributeName] : undefined;
        this.newValue = newValue;
    }

    execute() {
        this.object[this.attributeName] = this.newValue;
        global.app.call("objectChanged", this, this.object);

        return {
            message: `SetValueCommand: Value changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object[this.attributeName] = this.oldValue;
        global.app.call("objectChanged", this, this.object);

        return {
            message: `SetValueCommand: Value reverted (${this.object.name})`,
            status: "success",
        };
    }

    update(cmd) {
        this.newValue = cmd.newValue;
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

        this.attributeName = json.attributeName;
        this.oldValue = json.oldValue;
        this.newValue = json.newValue;
        this.object = this.editor.objectByUuid(json.objectUuid);
    }
}

export {SetValueCommand};
