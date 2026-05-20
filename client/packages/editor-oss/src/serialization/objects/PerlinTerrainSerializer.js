import PerlinTerrain from "@web-shared/object/terrain/PerlinTerrain";
import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";

/**
 * PerlinTerrainSerializer
 *
 */
class PerlinTerrainSerializer extends BaseSerializer {
    defaultObject = new PerlinTerrain();
    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);

        return json;
    }

    fromJSON(json) {
         
        var terrain = new PerlinTerrain(
            json.userData.width,
            json.userData.depth,
            json.userData.widthSegments,
            json.userData.depthSegments,
            json.userData.quality,
        );

        Object3DSerializer.prototype.fromJSON.call(this, json, terrain);

        return terrain;
    }
}

export default PerlinTerrainSerializer;
