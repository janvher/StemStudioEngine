import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * CylinderBufferGeometrySerializer
 *
 */
class CylinderBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.CylinderGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.CylinderGeometry(
                json.parameters.radiusTop,
                json.parameters.radiusBottom,
                json.parameters.height,
                json.parameters.radialSegments,
                json.parameters.heightSegments,
                json.parameters.openEnded,
                json.parameters.thetaStart,
                json.parameters.thetaLength,
            );
        } else if (!parent) {
            obj = new THREE.CylinderGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default CylinderBufferGeometrySerializer;
