import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TextureSerializer from "./TextureSerializer";

/**
 * DepthTextureSerializer
 *
 */
class DepthTextureSerializer extends BaseSerializer {
    defaultTexture = new THREE.DataTexture();
    toJSON(obj) {
        return TextureSerializer.prototype.toJSON.call(this, obj, this.defaultTexture);
    }

    fromJSON(json, parent, options) {
        var obj = parent === undefined ? this.defaultTexture : parent;

        TextureSerializer.prototype.fromJSON.call(this, json, obj, options);

        return obj;
    }
}

export default DepthTextureSerializer;
