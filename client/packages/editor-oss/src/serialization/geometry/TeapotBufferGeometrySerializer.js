import {TeapotGeometry} from "three/examples/jsm/geometries/TeapotGeometry.js";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * TeapotBufferGeometrySerializer
 *
 */
class TeapotBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new TeapotGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            obj = new TeapotGeometry(
                json.parameters.size,
                json.parameters.segments,
                json.parameters.bottom,
                json.parameters.lid,
                json.parameters.body,
                json.parameters.fitLid,
                json.parameters.blinn,
            );
        } else if (!parent) {
            obj = new TeapotGeometry();
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default TeapotBufferGeometrySerializer;
