import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import LightSerializer from "./LightSerializer";

/**
 * AmbientLightSerializer
 *
 */

const propertiesFrom = ["color", "intensity"];
class AmbientLightSerializer extends BaseSerializer {
    defaultLight = new THREE.AmbientLight();
    toJSON(obj) {
        const json = LightSerializer.prototype.toJSON.call(this, obj, this.defaultLight);

        return json;
    }

    fromJSON(json, parent) {
        const config = { ...json };
        propertiesFrom.forEach(prop => {
            if (config[prop] === undefined) {
                config[prop] = this.defaultLight[prop];
            }
        });
        const obj = parent === undefined ? new THREE.AmbientLight(config.color, config.intensity) : parent;

        LightSerializer.prototype.fromJSON.call(this, config, obj);

        obj.isAmbientLight = true;
        return obj;
    }
}

export default AmbientLightSerializer;
