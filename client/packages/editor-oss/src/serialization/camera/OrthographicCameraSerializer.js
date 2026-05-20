import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import CameraSerializer from "./CameraSerializer";

/**
 * OrthographicCameraSerializer
 *
 */

const properties = ["bottom", "far", "left", "near", "right", "top", "view", "zoom"];
class OrthographicCameraSerializer extends BaseSerializer {
    defaultObject = new THREE.OrthographicCamera();
    toJSON(obj) {
        var json = CameraSerializer.prototype.toJSON.call(this, obj);

        properties.forEach(prop => {
            if (obj[prop] !== this.defaultObject[prop]) {
                json[prop] = obj[prop];
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        var obj = parent === undefined ? this.defaultObject : parent;

        CameraSerializer.prototype.fromJSON.call(this, json, obj);

        properties.forEach(prop => {
            if (json[prop] !== undefined) {
                obj[prop] = json[prop];
            }
        });

        return obj;
    }
}

export default OrthographicCameraSerializer;
