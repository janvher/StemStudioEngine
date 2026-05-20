import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * ExtrudeBufferGeometrySerializer
 *
 */
class ExtrudeBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.ExtrudeGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.ExtrudeGeometry(json.parameters.shapes, json.parameters.options);
        } else if (!parent) {
            obj = new THREE.ExtrudeGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default ExtrudeBufferGeometrySerializer;
