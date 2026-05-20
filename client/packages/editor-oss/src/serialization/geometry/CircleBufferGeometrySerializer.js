import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * CircleBufferGeometrySerializer
 *
 */
class CircleBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.CircleGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.CircleGeometry(
                json.parameters.radius,
                json.parameters.segments,
                json.parameters.thetaStart,
                json.parameters.thetaLength,
            );
        } else if (!parent) {
            obj = new THREE.CircleGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default CircleBufferGeometrySerializer;
