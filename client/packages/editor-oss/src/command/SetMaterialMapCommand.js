
/**
 * Module: SetMaterialMapCommand.js
 * Purpose: Contains logic for set material map command.
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
class SetMaterialMapCommand extends Command {
    constructor(object, mapName, newMap) {
        super();
        this.editor = global.app.editor;
        this.type = "SetMaterialMapCommand";
        this.name = t("Set Material") + "." + mapName;

        this.object = object;
        this.mapName = mapName;
        this.oldMap = object !== undefined ? object.material[mapName] : undefined;
        this.newMap = newMap;
    }

    execute() {
        this.object.material[this.mapName] = this.newMap;
        this.object.material.needsUpdate = true;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialMapCommand: Material map changed (${this.object.name})`,
            status: "success",
        };
    }

    undo() {
        this.object.material[this.mapName] = this.oldMap;
        this.object.material.needsUpdate = true;
        global.app.call("objectChanged", this, this.object);
        return {
            message: `SetMaterialMapCommand: Material map reverted (${this.object.name})`,
            status: "success",
        };
    }

    toJSON() {
        var output = Command.prototype.toJSON.call(this);

        output.objectUuid = this.object.uuid;
        output.mapName = this.mapName;
        output.newMap = serializeMap(this.newMap);
        output.oldMap = serializeMap(this.oldMap);

        return output;

        // serializes a map (THREE.Texture)

        /**
         *
         * @param map
         */
        function serializeMap(map) {
            if (map === null || map === undefined) return null;

            var meta = {
                geometries: {},
                materials: {},
                textures: {},
                images: {},
            };

            var json = map.toJSON(meta);
            var images = extractFromCache(meta.images);
            if (images.length > 0) json.images = images;
            json.sourceFile = map.sourceFile;

            return json;
        }

        // Note: The function 'extractFromCache' is copied from Object3D.toJSON()

        // extract data from the cache hash
        // remove metadata on each item
        // and return as array
        /**
         *
         * @param cache
         */
        function extractFromCache(cache) {
            var values = [];
            for (var key in cache) {
                var data = cache[key];
                delete data.metadata;
                values.push(data);
            }
            return values;
        }
    }

    fromJSON(json) {
        Command.prototype.fromJSON.call(this, json);

        this.object = this.editor.objectByUuid(json.objectUuid);
        this.mapName = json.mapName;
        this.oldMap = parseTexture(json.oldMap);
        this.newMap = parseTexture(json.newMap);

        /**
         *
         * @param json
         */
        function parseTexture(json) {
            var map = null;
            if (json !== null) {
                var loader = new THREE.ObjectLoader();
                var images = loader.parseImages(json.images);
                var textures = loader.parseTextures([json], images);
                map = textures[json.uuid];
                map.sourceFile = json.sourceFile;
            }
            return map;
        }
    }
}

export {SetMaterialMapCommand};
