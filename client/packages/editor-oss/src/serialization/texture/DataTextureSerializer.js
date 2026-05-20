import * as THREE from "three";

import TextureSerializer from "./TextureSerializer";

/**
 * DataTextureSerializer
 *
 */
class DataTextureSerializer extends TextureSerializer {
    defaultTexture = new THREE.DataTexture();
    toJSON(obj) {
        return super.toJSON(obj, this.defaultTexture);
    }

    fromJSON(json, parent, options) {
        var obj = parent === undefined ? this.defaultTexture : parent;

        super.fromJSON(json, obj, options);

        return obj;
    }
}

export default DataTextureSerializer;
