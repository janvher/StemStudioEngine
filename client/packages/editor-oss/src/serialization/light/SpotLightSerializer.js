import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import LightSerializer from "./LightSerializer";

/**
 * SpotLightSerializer
 *
 */

const properties = ["distance", "angle", "penumbra", "decay"];
const propertiesFrom = ["distance", "angle", "penumbra", "decay", "color", "intensity"];
class SpotLightSerializer extends BaseSerializer {
    defaultLight = new THREE.SpotLight();
    toJSON(obj) {
        var json = LightSerializer.prototype.toJSON.call(this, obj);

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
            parent === undefined
                ? new THREE.SpotLight(config.color, config.intensity, config.distance, config.angle, config.penumbra, config.decay)
                : parent;

        LightSerializer.prototype.fromJSON.call(this, config, obj);

        obj.distance = config.distance;
        obj.angle = config.angle;
        obj.penumbra = config.penumbra;
        obj.decay = config.decay;

        obj.isSpotLight = true;

        return obj;
    }
}

export default SpotLightSerializer;
