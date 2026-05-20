import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TextureSerializer from "./TextureSerializer";

/**
 * CanvasTextureSerializer
 *
 */
class CanvasTextureSerializer extends BaseSerializer {
    defaultTexture = new THREE.CanvasTexture();
    toJSON(obj) {
        return TextureSerializer.prototype.toJSON.call(this, obj, this.defaultTexture);
    }

    fromJSON(json, parent, options) {
        var obj = parent === undefined ? this.defaultTexture : parent;

        TextureSerializer.prototype.fromJSON.call(this, json, obj, options);

        return obj;
    }
}

export default CanvasTextureSerializer;
