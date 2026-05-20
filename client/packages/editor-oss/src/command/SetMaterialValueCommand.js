
/**
 * Module: SetMaterialValueCommand.js
 * Purpose: Contains logic for set material value command.
 */


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
class SetMaterialValueCommand extends Command {
    constructor(object, attributeName, newValue) {
        super();
        this.editor = global.app.editor;
        this.type = "SetMaterialValueCommand";
        this.name = "Set Material" + "." + attributeName;
        this.updatable = true;

        this.object = object;
        this.oldValue = object !== undefined ? object.material[attributeName] : undefined;
        this.newValue = newValue;
        this.attributeName = attributeName;
    }

    execute() {
        this.object.material[this.attributeName] = this.newValue;
        this.object.material.needsUpdate = true;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialValueCommand: Material value changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.material[this.attributeName] = this.oldValue;
        this.object.material.needsUpdate = true;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialValueCommand: Material value reverted (${this.object.name})`,
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

export {SetMaterialValueCommand};
