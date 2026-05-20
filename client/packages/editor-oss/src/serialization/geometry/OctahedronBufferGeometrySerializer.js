import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * OctahedronBufferGeometrySerializer
 *
 */
class OctahedronBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.OctahedronGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.OctahedronGeometry(json.parameters.radius, json.parameters.detail);
        } else if (!parent) {
            obj = new THREE.OctahedronGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default OctahedronBufferGeometrySerializer;
