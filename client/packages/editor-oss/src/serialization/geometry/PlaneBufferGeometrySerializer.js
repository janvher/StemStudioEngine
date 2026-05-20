import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * PlaneBufferGeometrySerializer
 *
 */
class PlaneBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.PlaneGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.PlaneGeometry(
                json.parameters.width,
                json.parameters.height,
                json.parameters.widthSegments,
                json.parameters.heightSegments,
            );
        } else if (!parent) {
            obj = new THREE.PlaneGeometry();
        }

        obj.rotateX(-Math.PI / 2);

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default PlaneBufferGeometrySerializer;
