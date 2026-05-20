import BaseLightShadowSerializer from "./BaseLightShadowSerializer";
import LightShadowSerializer from "./LightShadowSerializer";

/**
 * SpotLightShadowSerializer
 *
 */
class SpotLightShadowSerializer extends BaseLightShadowSerializer {
    toJSON(obj, defaultShadow) {
        var json = LightShadowSerializer.prototype.toJSON.call(this, obj, defaultShadow);

        return json;
    }
}

export default SpotLightShadowSerializer;
