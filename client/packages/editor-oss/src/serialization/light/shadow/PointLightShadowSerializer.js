import BaseLightShadowSerializer from "./BaseLightShadowSerializer";
import LightShadowSerializer from "./LightShadowSerializer";

/**
 * SpotLightShadowSerializer
 *
 */
class PointLightShadowSerializer extends BaseLightShadowSerializer {
    toJSON(obj, defaultShadow) {
        var json = LightShadowSerializer.prototype.toJSON.call(this, obj, defaultShadow);

        return json;
    }
}

export default PointLightShadowSerializer;
