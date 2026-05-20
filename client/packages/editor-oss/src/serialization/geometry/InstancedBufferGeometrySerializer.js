import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * InstancedBufferGeometrySerializer
 *
 */
class InstancedBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.InstancedBufferGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        var obj = parent === undefined ? this.defaultGeometry : parent;

        // TODO:

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default InstancedBufferGeometrySerializer;
