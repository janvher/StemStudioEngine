import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import WebGLShadowMapSerializer from "./WebGLShadowMapSerializer";

/**
 * WebGLRendererSerializer
 *
 */

const DEFAULT_OBJECT = new THREE.WebGLRenderer({preserveDrawingBuffer: true});
const properties = [
    "autoClear",
    "autoClearColor",
    "autoClearDepth",
    "autoClearStencil",
    "autoUpdateScene",
    "clippingPlanes",
    "gammaFactor",
    "localClippingEnabled",
    "physicallyCorrectLights",
    "shadowMap",
    "sortObjects",
    "toneMapping",
    "toneMappingExposure",
];
class WebGLRendererSerializer extends BaseSerializer {
    toJSON(obj) {
        var json = BaseSerializer.prototype.toJSON.call(this, obj);

        properties.forEach(prop => {
            if (prop === "shadowMap") {
                json[prop] = new WebGLShadowMapSerializer().toJSON(obj[prop], DEFAULT_OBJECT.shadowMap);
            } else if (JSON.stringify(obj[prop]) !== JSON.stringify(DEFAULT_OBJECT[prop])) {
                json[prop] = obj[prop];
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        var obj =
            parent === undefined
                ? new THREE.WebGLRenderer({antialias: json.antialias, preserveDrawingBuffer: true})
                : parent;

        properties.forEach(prop => {
            if (prop === "shadowMap") {
                new WebGLShadowMapSerializer().fromJSON(json[prop], obj[prop]);
            } else if (json[prop] !== undefined) {
                obj[prop] = json[prop];
            }
        });

        return obj;
    }
}

export default WebGLRendererSerializer;
