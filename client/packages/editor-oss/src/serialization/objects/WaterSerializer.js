import Water from "@web-shared/object/component/Water";
import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";

/**
 * WaterSerializer
 *
 */
class WaterSerializer extends BaseSerializer {
    defaultObject = new Water();
    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);
        return json;
    }

    fromJSON(json, parent, options) {
        var obj = new Water(options.renderer);

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        obj.update();

        return obj;
    }
}

export default WaterSerializer;
