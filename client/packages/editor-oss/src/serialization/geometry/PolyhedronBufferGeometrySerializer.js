import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * PolyhedronBufferGeometrySerializer
 *
 */
class PolyhedronBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.PolyhedronGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.PolyhedronGeometry(
                json.parameters.vertices,
                json.parameters.indices,
                json.parameters.radius,
                json.parameters.detail,
            );
        } else if (!parent) {
            obj = new THREE.PolyhedronGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default PolyhedronBufferGeometrySerializer;
