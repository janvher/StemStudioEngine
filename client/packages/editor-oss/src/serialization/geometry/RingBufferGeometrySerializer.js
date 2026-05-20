import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * RingBufferGeometrySerializer
 *
 */
class RingBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.RingGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.RingGeometry(
                json.parameters.innerRadius,
                json.parameters.outerRadius,
                json.parameters.thetaSegments,
                json.parameters.phiSegments,
                json.parameters.thetaStart,
                json.parameters.thetaLength,
            );
        } else if (!parent) {
            obj = new THREE.RingGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default RingBufferGeometrySerializer;
