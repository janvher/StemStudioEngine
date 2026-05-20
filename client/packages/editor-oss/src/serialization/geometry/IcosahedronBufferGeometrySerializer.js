import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * IcosahedronBufferGeometrySerializer
 *
 */
class IcosahedronBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.IcosahedronGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.IcosahedronGeometry(json.parameters.radius, json.parameters.detai);
        } else if (!parent) {
            obj = new THREE.IcosahedronGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default IcosahedronBufferGeometrySerializer;
