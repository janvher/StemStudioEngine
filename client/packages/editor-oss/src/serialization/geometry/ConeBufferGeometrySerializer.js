import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * ConeBufferGeometrySerializer
 *
 */
class ConeBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.ConeGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.ConeGeometry(
                json.parameters.radius,
                json.parameters.height,
                json.parameters.radialSegments,
                json.parameters.heightSegments,
                json.parameters.openEnded,
                json.parameters.thetaStart,
                json.parameters.thetaLength,
            );
        } else if (!parent) {
            obj = new THREE.ConeGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default ConeBufferGeometrySerializer;
