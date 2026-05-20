import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import LightSerializer from "./LightSerializer";

/**
 * PointLightSerializer
 *
 */

const properties = ["distance", "decay"];
const propertiesFrom = ["distance", "decay", "color", "intensity"];
class PointLightSerializer extends BaseSerializer {
    defaultLight = new THREE.PointLight();
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

        var obj =
            parent === undefined ? new THREE.PointLight(config.color, config.intensity, config.distance, config.decay) : parent;

        LightSerializer.prototype.fromJSON.call(this, config, obj);

        obj.isPointLight = true;

        return obj;
    }
}

export default PointLightSerializer;
