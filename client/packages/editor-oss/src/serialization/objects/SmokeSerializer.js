import Smoke from "@web-shared/object/component/Smoke";
import BaseSerializer from "../BaseSerializer";
import MeshSerializer from "../core/MeshSerializer";

/**
 * SmokeSerializer
 *
 */
class SmokeSerializer extends BaseSerializer {
    toJSON(obj) {
        var json = MeshSerializer.prototype.toJSON.call(this, obj);

        return json;
    }

    fromJSON(json, parent, options) {
        var obj = parent || new Smoke(json.userData, options.oldCamera || options.camera, options.renderer);

        MeshSerializer.prototype.fromJSON.call(this, json, obj, options);

        return obj;
    }
}

export default SmokeSerializer;
