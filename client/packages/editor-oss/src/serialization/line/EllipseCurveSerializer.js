import EllipseCurve from "@web-shared/object/line/EllipseCurve";
import BaseSerializer from "../BaseSerializer";
import MeshSerializer from "../core/MeshSerializer";

/**
 * EllipseCurveSerializer
 *
 */
class EllipseCurveSerializer extends BaseSerializer {
    toJSON(obj) {
        var json = MeshSerializer.prototype.toJSON.call(this, obj);

        return json;
    }

    fromJSON(json, parent) {
        var obj = parent || new EllipseCurve(json.userData);

        MeshSerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default EllipseCurveSerializer;
