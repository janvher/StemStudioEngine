import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * TorusBufferGeometrySerializer
 *
 */
class TorusBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.TorusGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.TorusGeometry(
                json.parameters.radius,
                json.parameters.tube,
                json.parameters.radialSegments,
                json.parameters.tubularSegments,
                json.parameters.arc,
            );
        } else if (!parent) {
            obj = defaultGeometry;
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default TorusBufferGeometrySerializer;
