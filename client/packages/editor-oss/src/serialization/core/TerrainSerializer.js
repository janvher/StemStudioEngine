
/**
 * Module: TerrainSerializer.js
 * Purpose: Contains logic for terrain serializer.
 */


import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "./Object3DSerializer";
import TerrainUtil from "@web-shared/utils/TerrainUtil";

/**
 * TerrainSerializer
 * {
 *     id: "0",
 *     name: "Mountains",
 *     map: "/Upload/Map/terrain.png",
 *     maxHeight: 5,
 *     minHeight: -7,
 *     texture: "/Upload/Texture/texture.png"
 * }
 */
class TerrainSerializer extends BaseSerializer {
    constructor(convertServerObjUrls = false, physics = null) {
        super();
        this.physics = physics;
        this.convertServerObjUrls = convertServerObjUrls;
    }

    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj);
        json.userData = Object.assign({}, obj.userData);
        if (this.convertServerObjUrls && json.userData.map && !json.userData.map.startsWith("http")) {
            json.userData.map = location.origin + json.userData.map;
        }
        if (this.convertServerObjUrls && json.userData.texture && !json.userData.texture.startsWith("http")) {
            json.userData.texture = location.origin + json.userData.texture;
        }

        delete json.userData.physics;
        // delete json.userData.helper;

        return json;
    }

    fromJSON(json, parent, options) {
        let map = json.userData.map;
        let texture = json.userData.texture;

        if (!map.startsWith("http")) {
            map = (options.server || '') + map;
        }

        if (!map.startsWith("http")) {
            texture = (options.server || '') + texture;
        }

        options.skipChildrenClear = true;

        const loader = new TerrainUtil(
            this.physics,
            map,
            texture,
            json.userData.maxHeight,
            json.userData.minHeight,
            json.userData.textureRepeatU,
            json.userData.textureRepeatV,
        );

        return new Promise(resolve => {
            loader.buildMesh(this.physics && json.userData.usePhysics).then(mesh => {
                Object3DSerializer.prototype.fromJSON.call(this, json, mesh);
                resolve(mesh);
            });
        });
    }
}

export default TerrainSerializer;
