
/**
 * Module: CubeTextureSerializer.js
 * Purpose: Contains logic for cube texture serializer.
 */


import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TextureSerializer from "./TextureSerializer";
import ImageUtils from "@web-shared/utils/ImageUtils";

/**
 * CubeTextureSerializer
 *
 */
class CubeTextureSerializer extends BaseSerializer {
    defaultTexture = new THREE.CubeTexture();
    toJSON(obj) {
        var json = TextureSerializer.prototype.toJSON.call(this, obj, this.defaultTexture);

        json.image = [];

        obj.image.forEach(n => {
            if (n.src.startsWith("data")) {
                // base64
                json.image.push({
                    tagName: "img",
                    src: n.src,
                    width: n.width,
                    height: n.height,
                });
            } else {
                // url
                json.image.push({
                    tagName: "img",
                    src: n.src.replace(location.href, "/"),
                    width: n.width,
                    height: n.height,
                });
            }
        });

        return json;
    }

    fromJSON(json, parent, options) {

        var img = ImageUtils.onePixelCanvas();
        var obj = parent === undefined ? new THREE.CubeTexture([img, img, img, img, img, img]) : parent;

        TextureSerializer.prototype.fromJSON.call(this, json, obj, options);

        if (Array.isArray(json.image)) {
            var promises = json.image.map(n => {
                return new Promise(resolve => {
                    var img = document.createElement("img");

                    if (n.src && n.src.startsWith("/")) {
                        img.src = (options.server || '') + n.src;
                    } else {
                        img.src = n.src;
                    }

                    img.width = n.width;
                    img.height = n.height;
                    img.onload = () => {
                        resolve(img);
                    };
                });
            });
            Promise.all(promises).then(imgs => {
                obj.image = imgs;
                obj.needsUpdate = true;
            });
        }

        return obj;
    }
}

export default CubeTextureSerializer;
