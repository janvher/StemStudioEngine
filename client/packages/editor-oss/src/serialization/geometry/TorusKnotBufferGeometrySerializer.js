import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * TorusKnotBufferGeometrySerializer
 *
 */
class TorusKnotBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.TorusKnotGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.TorusKnotGeometry(
                json.parameters.radius,
                json.parameters.tube,
                json.parameters.tubularSegments,
                json.parameters.radialSegments,
                json.parameters.p,
                json.parameters.q,
            );
        } else if (!parent) {
            obj = defaultGeometry;
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default TorusKnotBufferGeometrySerializer;
