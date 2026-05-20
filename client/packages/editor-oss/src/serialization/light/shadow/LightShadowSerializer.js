import * as THREE from "three";

import BaseSerializer from "@web-shared/serialization/BaseSerializer";
import CamerasSerializer from "@web-shared/serialization/camera/CamerasSerializer";

/**
 * LightShadowSerializer
 *
 */

const properties = ["bias", "normalBias", "camera", "mapSize", "radius"];
class LightShadowSerializer extends BaseSerializer {
    toJSON(obj, defaultShadow) {
        const shadow = defaultShadow ? defaultShadow : new THREE.Light().shadow;
        var json = BaseSerializer.prototype.toJSON.call(this, obj);
        properties.forEach(prop => {
            if (obj[prop] === shadow?.[prop]) {
                delete json[prop];
            } else if (prop === "camera") {
                json[prop] = new CamerasSerializer().toJSON(obj[prop]);
            } else {
                json[prop] = obj[prop];
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        let camera = new CamerasSerializer().fromJSON(json.camera);

        properties.forEach(prop => {
            if (prop === "camera") {
                parent.shadow[prop].copy(camera);
            } else if (prop === "mapSize") {
                parent.shadow[prop].copy(json[prop]);
            } else if (json[prop] !== undefined) {
                parent.shadow[prop] = json[prop];
            }
        });
    }
}

export default LightShadowSerializer;
