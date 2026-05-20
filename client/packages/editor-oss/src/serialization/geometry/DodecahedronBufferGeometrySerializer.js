import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * DodecahedronBufferGeometrySerializer
 *
 */
class DodecahedronBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.DodecahedronGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.DodecahedronGeometry(json.parameters.radius, json.parameters.detail);
        } else if (!parent) {
            obj = new THREE.DodecahedronGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default DodecahedronBufferGeometrySerializer;
