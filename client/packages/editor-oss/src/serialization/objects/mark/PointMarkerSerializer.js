import PointMarker from "@web-shared/object/mark/PointMarker";
import BaseSerializer from "@web-shared/serialization/BaseSerializer";
import Object3DSerializer from "@web-shared/serialization/core/Object3DSerializer";

/**
 * PointMarkerSerializer
 *
 */
class PointMarkerSerializer extends BaseSerializer {
    defaultObject = new PointMarker();
    toJSON(obj) {
        return Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);
    }

    fromJSON(json, parent, options) {
        var obj = new PointMarker(json.userData.text, {
            domWidth: options.domWidth,
            domHeight: options.domHeight,
        });

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default PointMarkerSerializer;
