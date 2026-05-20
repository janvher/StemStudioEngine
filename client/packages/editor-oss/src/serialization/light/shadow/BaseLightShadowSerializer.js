import LightShadowSerializer from "./LightShadowSerializer";
import BaseSerializer from "@web-shared/serialization/BaseSerializer";

class BaseLightShadowSerializer extends BaseSerializer {
    fromJSON(json, parent) {
        LightShadowSerializer.prototype.fromJSON.call(this, json, parent);
    }
}

export default BaseLightShadowSerializer;
