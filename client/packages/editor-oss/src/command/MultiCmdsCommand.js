
/**
 * Module: MultiCmdsCommand.js
 * Purpose: Contains logic for multi cmds command.
 */


import {t} from "i18next";
import * as THREE from "three";

import Command from "./Command";

/**
 *
 * @author dforrer / https://github.com/dforrer
 * Developed as part of a project at University of Applied Sciences and Arts Northwestern Switzerland (www.fhnw.ch)
 * @param {Array} cmdArray array containing command objects
 * @constructor
 */
class MultiCmdsCommand extends Command {
    constructor(cmdArray) {
        super();
        this.type = "MultiCmdsCommand";
        this.name = t("Multi Modify");

        this.cmdArray = cmdArray !== undefined ? cmdArray : [];
    }

    async execute() {
        let results = [];
        for (var i = 0; i < this.cmdArray.length; i++) {
            results.push(await this.cmdArray[i].execute());
        }
        return results;
    }

    undo() {
        let results = [];
        for (var i = this.cmdArray.length - 1; i >= 0; i--) {
            results.push(this.cmdArray[i].undo());
        }
        return results;
    }

    toJSON() {
        var output = Command.prototype.toJSON.call(this);

        var cmds = [];
        for (var i = 0; i < this.cmdArray.length; i++) {
            cmds.push(this.cmdArray[i].toJSON());
        }
        output.cmds = cmds;

        return output;
    }

    fromJSON(json) {
        Command.prototype.fromJSON.call(this, json);

        var cmds = json.cmds;
        for (var i = 0; i < cmds.length; i++) {
            var cmd = new window[cmds[i].type](); // creates a new object of type "json.type"
            cmd.fromJSON(cmds[i]);
            this.cmdArray.push(cmd);
        }
    }
}

export {MultiCmdsCommand};
