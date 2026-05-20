import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * CapsuleBufferGeometrySerializer
 *
 */
class CapsuleBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.CapsuleGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.CapsuleGeometry(
                json.parameters.radius,
                json.parameters.length,
                json.parameters.capSegments,
                json.parameters.radialSegments,
            );
        } else if (!parent) {
            obj = new THREE.CapsuleGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default CapsuleBufferGeometrySerializer;
