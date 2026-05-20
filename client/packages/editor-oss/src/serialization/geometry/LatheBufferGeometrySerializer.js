import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * LatheBufferGeometrySerializer
 *
 */
class LatheBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.LatheGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.LatheGeometry(
                json.parameters.points,
                json.parameters.segments,
                json.parameters.phiStart,
                json.parameters.phiLength,
            );
        } else if (!parent) {
            obj = new THREE.LatheGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default LatheBufferGeometrySerializer;
