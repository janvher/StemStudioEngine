import Fire from "@web-shared/object/component/Fire";
import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";

/**
 * FireSerializer
 *
 */
class FireSerializer extends BaseSerializer {
    defaultObject = new Fire();
    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);

        delete json.userData.fire;

        return json;
    }

    fromJSON(json, parent, options) {
         
        var fire = new Fire(options.oldCamera || options.camera, {
            width: json.userData.width,
            height: json.userData.height,
            depth: json.userData.depth,
            sliceSpacing: json.userData.sliceSpacing,
        });

        Object3DSerializer.prototype.fromJSON.call(this, json, fire);

        fire.userData.fire.update(0);

        return fire;
    }
}

export default FireSerializer;
