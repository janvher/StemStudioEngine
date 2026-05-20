import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * BoxBufferGeometrySerializer
 *
 */
class BoxBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.BoxGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new THREE.BoxGeometry(
                json.parameters.width,
                json.parameters.height,
                json.parameters.depth,
                json.parameters.widthSegments,
                json.parameters.heightSegments,
                json.parameters.depthSegments,
            );
        } else if (!parent) {
            obj = new THREE.BoxGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default BoxBufferGeometrySerializer;
