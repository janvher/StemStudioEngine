import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import LightSerializer from "./LightSerializer";

/**
 * RectAreaLightSerializer
 *
 */

const properties = ["width", "height"];
const propertiesFrom = ["color", "intensity", "width", "height"];
class RectAreaLightSerializer extends BaseSerializer {
    defaultLight = new THREE.RectAreaLight();
    toJSON(obj) {
        var json = LightSerializer.prototype.toJSON.call(this, obj, this.defaultLight);

        properties.forEach(prop => {
            if (obj[prop] !== this.defaultLight[prop]) {
                json[prop] = obj[prop];
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        const config = { ...json };
        propertiesFrom.forEach(prop => {
            if (config[prop] === undefined) {
                config[prop] = this.defaultLight[prop];
            }
        });
        var obj = parent === undefined ? new THREE.RectAreaLight(config.color, config.intensity, config.width, config.height) : parent;

        LightSerializer.prototype.fromJSON.call(this, config, obj);

        obj.isRectAreaLight = true;

        return obj;
    }
}

export default RectAreaLightSerializer;
