import UnscaledText from "@web-shared/object/text/UnscaledText";
import BaseSerializer from "@web-shared/serialization/BaseSerializer";
import Object3DSerializer from "@web-shared/serialization/core/Object3DSerializer";

/**
 * UnscaledTextSerializer
 *
 */
class UnscaledTextSerializer extends BaseSerializer {
    defaultObject = new UnscaledText();
    toJSON(obj) {
        return Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);
    }

    fromJSON(json, parent, options) {
        var obj = new UnscaledText(json.userData.text, {
            domWidth: options.domWidth,
            domHeight: options.domHeight,
        });

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default UnscaledTextSerializer;
