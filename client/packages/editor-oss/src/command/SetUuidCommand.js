
/**
 * Module: SetUuidCommand.js
 * Purpose: Contains logic for set uuid command.
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
 * @constructor
 */
class SetUuidCommand extends Command {
    constructor(object, newUuid) {
        super();
        this.editor = global.app.editor;
        this.type = "SetUuidCommand";
        this.name = t("Update UUID");

        this.object = object;

        this.oldUuid = object !== undefined ? object.uuid : undefined;
        this.newUuid = newUuid;
    }

    execute() {
        this.object.uuid = this.newUuid;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetUuidCommand: UUID changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.uuid = this.oldUuid;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetUuidCommand: UUID reverted (${this.object.name})`,
            status: "success",
        };
    }

    toJSON() {
        var output = Command.prototype.toJSON.call(this);

        output.oldUuid = this.oldUuid;
        output.newUuid = this.newUuid;

        return output;
    }

    fromJSON(json) {
        Command.prototype.fromJSON.call(this, json);

        this.oldUuid = json.oldUuid;
        this.newUuid = json.newUuid;
        this.object = this.editor.objectByUuid(json.oldUuid);

        if (this.object === undefined) {
            this.object = this.editor.objectByUuid(json.newUuid);
        }
    }
}

export {SetUuidCommand};
