import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * ShapeBufferGeometrySerializer
 *
 */
class ShapeBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.ShapeGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            // Shape parameters contain UUIDs or references that can't be directly deserialized
            // For CustomShape objects, the geometry will be recreated from SVG path in userData
            // For regular ShapeGeometry, we create a default and let BufferGeometrySerializer
            // restore any serialized properties
            obj = this.defaultGeometry;
        } else if (!parent) {
            obj = this.defaultGeometry;
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default ShapeBufferGeometrySerializer;
