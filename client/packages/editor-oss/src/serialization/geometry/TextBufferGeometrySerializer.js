import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * TextBufferGeometrySerializer
 *
 */
class TextBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = null; // TextGeometry requires font parameter, cannot have a default instance
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        // TextGeometry requires a Font object which cannot be easily deserialized
        // from json.parameters. For Text3D objects, the geometry will be recreated
        // by a custom serializer that loads the font. For now, return a placeholder.
        if (!parent) {
            // Create a simple placeholder geometry
            obj = new THREE.BoxGeometry(1, 1, 0.1);
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default TextBufferGeometrySerializer;
