import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "./Object3DSerializer";

/**
 * BoneSerializer
 *
 */
class BoneSerializer extends BaseSerializer {
    defaultObject = new THREE.Bone();
    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);

        return json;
    }

    fromJSON(json, parent) {
        var obj = parent === undefined ? this.defaultObject : parent;

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default BoneSerializer;
