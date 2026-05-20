import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * SphereBufferGeometrySerializer
 *
 */
class SphereBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.SphereGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.SphereGeometry(
                json.parameters.radius,
                json.parameters.widthSegments,
                json.parameters.heightSegments,
                json.parameters.phiStart,
                json.parameters.phiLength,
                json.parameters.thetaStart,
                json.parameters.thetaLength,
            );
        } else if (!parent) {
            obj = new THREE.SphereGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default SphereBufferGeometrySerializer;
