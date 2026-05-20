import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TexturesSerializer from "../texture/TexturesSerializer";

/**
 * WebGLRenderTargetSerializer
 *
 */

const properties = [
    "depthBuffer",
    "depthTexture",
    "height",
    "scissor",
    "scissorTest",
    "stencilBuffer",
    "texture",
    "viewport",
    "width",
    "isWebGLRenderTarget",
];
class WebGLRenderTargetSerializer extends BaseSerializer {
    defaultObject = new THREE.WebGLRenderTarget();
    toJSON(obj) {
        var json = BaseSerializer.prototype.toJSON.call(this, obj);

        properties.forEach(prop => {
            if (obj[prop] !== this.defaultObject[prop]) {
                json[prop] = obj[prop];
            } else if (["depthTexture", "texture"].includes(prop)) {
                json[prop] = new TexturesSerializer().toJSON(obj[prop]);
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        var obj = parent === undefined ? new THREE.WebGLRenderTarget(json.width, json.height) : parent;

        properties.forEach(prop => {
            if (["depthTexture", "texture"].includes(prop)) {
                obj[prop] = !json[prop] ? null : new TexturesSerializer().fromJSON(json[prop]);
            } else if (json[prop] !== undefined) {
                obj[prop] = json[prop];
            }
        });

        return obj;
    }
}

export default WebGLRenderTargetSerializer;
