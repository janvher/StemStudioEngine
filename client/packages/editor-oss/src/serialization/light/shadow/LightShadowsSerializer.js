import * as THREE from "three";

import DirectionalLightShadowSerializer from "./DirectionalLightShadowSerializer";
import LightShadowSerializer from "./LightShadowSerializer";
import PointLightShadowSerializer from "./PointLightShadowSerializer";
import SpotLightShadowSerializer from "./SpotLightShadowSerializer";
import BaseSerializer from "@web-shared/serialization/BaseSerializer";



const Serializers = {
    isLightShadow: LightShadowSerializer,
    isDirectionalLightShadow: DirectionalLightShadowSerializer,
    isSpotLightShadow: SpotLightShadowSerializer,
    isPointLightShadow: PointLightShadowSerializer,
};

/**
 * LightShadowsSerializer
 *
 */
class LightShadowsSerializer extends BaseSerializer {
    toJSON(obj, defaultLight) {
        const light = defaultLight ? defaultLight : new THREE.Light();
        let serializer = Serializers.isLightShadow;

        for (const [key, value] of Object.entries(Serializers)) {
            if (obj[key]) {
                serializer = value;
                break;
            }
        }

        if (serializer === undefined) {
            console.warn(`LightShadowsSerializer: No serializer with  ${obj.constructor.name}.`);
            return null;
        }

        return new serializer().toJSON(obj, light.shadow);
    }

    fromJSON(json, parent) {
        let generator = json.metadata.generator;

        let serializer = Serializers["is" + generator.replace("Serializer", "")];

        if (serializer === undefined) {
            console.warn(`LightShadowsSerializer: No deserializer with ${generator}.`);
            return null;
        }

        new serializer().fromJSON(json, parent);
    }
}

export default LightShadowsSerializer;
