import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * TetrahedronBufferGeometrySerializer
 *
 */
class TetrahedronBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.TetrahedronGeometry();

    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.TetrahedronGeometry(json.parameters.radius, json.parameters.detail);
        } else if (!parent) {
            obj = this.defaultGeometry;
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default TetrahedronBufferGeometrySerializer;
