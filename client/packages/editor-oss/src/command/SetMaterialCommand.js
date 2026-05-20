
/**
 * Module: SetMaterialCommand.js
 * Purpose: Contains logic for set material command.
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
class SetMaterialCommand extends Command {
    constructor(object, newMaterial) {
        super();
        this.editor = global.app.editor;
        this.type = "SetMaterialCommand";
        this.name = t("New Material");

        this.object = object;
        this.oldMaterial = object !== undefined ? object.material : undefined;
        this.newMaterial = newMaterial;
    }

    execute() {
        this.object.material = this.newMaterial;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialCommand: Material changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.material = this.oldMaterial;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialCommand: Material reverted (${this.object.name})`,
            status: "success",
        };
    }

    toJSON() {
        var output = Command.prototype.toJSON.call(this);

        output.objectUuid = this.object.uuid;
        output.oldMaterial = this.oldMaterial.toJSON();
        output.newMaterial = this.newMaterial.toJSON();

        return output;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.oldMaterial = parseMaterial(json.oldMaterial);
        this.newMaterial = parseMaterial(json.newMaterial);

        /**
         *
         * @param json
         */
        function parseMaterial(json) {
            var loader = new THREE.ObjectLoader();
            var images = loader.parseImages(json.images);
            var textures = loader.parseTextures(json.textures, images);
            var materials = loader.parseMaterials([json], textures);
            return materials[json.uuid];
        }
    }
}

export {SetMaterialCommand};
