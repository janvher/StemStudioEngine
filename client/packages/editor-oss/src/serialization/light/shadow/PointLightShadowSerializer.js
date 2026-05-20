import * as THREE from "three";

import BaseLightShadowSerializer from "./BaseLightShadowSerializer";
import LightShadowSerializer from "./LightShadowSerializer";
import BaseSerializer from "@web-shared/serialization/BaseSerializer";

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
