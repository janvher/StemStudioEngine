import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import LightSerializer from "./LightSerializer";

/**
 * HemisphereLightSerializer
 *
 */

const properties = ["skyColor", "groundColor"];
const propertiesFrom = ["skyColor", "groundColor", "intensity"];
class HemisphereLightSerializer extends BaseSerializer {
    defaultLight = new THREE.HemisphereLight();
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
            parent === undefined ? new THREE.HemisphereLight(config.skyColor, config.groundColor, config.intensity) : parent;

        LightSerializer.prototype.fromJSON.call(this, config, obj);

        obj.isHemisphereLight = true;
        return obj;
    }
}

export default HemisphereLightSerializer;
