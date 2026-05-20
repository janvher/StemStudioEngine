import BaseLightShadowSerializer from "./BaseLightShadowSerializer";
import LightShadowSerializer from "./LightShadowSerializer";
import BaseSerializer from "@web-shared/serialization/BaseSerializer";

/**
 * DirectionalLightShadowSerializer
 *
 */
class DirectionalLightShadowSerializer extends BaseLightShadowSerializer {
    toJSON(obj, defaultShadow) {
        let json = LightShadowSerializer.prototype.toJSON.call(this, obj, defaultShadow);

        return json;
    }
}

export default DirectionalLightShadowSerializer;
