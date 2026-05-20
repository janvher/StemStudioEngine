import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "./Object3DSerializer";

/**
 * GroupSerializer
 *
 */
class GroupSerializer extends BaseSerializer {
    defaultObject = new THREE.Group();
    toJSON(obj) {
        return Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);
    }

    fromJSON(json, parent) {
        var obj = parent === undefined ? this.defaultObject : parent;

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default GroupSerializer;
