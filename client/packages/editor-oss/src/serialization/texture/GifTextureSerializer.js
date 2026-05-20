import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TextureSerializer from "./TextureSerializer";
import ImageUtils from "@web-shared/utils/ImageUtils";

class GifTextureSerializer extends BaseSerializer {
    toJSON(obj) {
        var metaJson = BaseSerializer.prototype.toJSON.call(this, obj);
        var json = TextureSerializer.prototype.toJSON(obj);
        json.metadata = metaJson.metadata;
        delete json.image;
        json.gifUrl = obj.gif.url;

        return json;
    }

    fromJSON(json, parent, options) {
        const obj = TextureSerializer.prototype.fromJSON(json, parent, { ...options, skipImage: true });
        const img = document.createElement("img");

        if (!json.gifUrl.startsWith("blob:http://")) {
            if (json.gifUrl && json.gifUrl.startsWith("/")) {
                img.src = (options.server || '') + json.gifUrl;
            } else {
                img.src = json.gifUrl;
            }
        }

        obj.image = img;
        obj.needsUpdate = true;
        img.onload = function () {
            obj.image = img;
            obj.needsUpdate = true;
        };

        obj.gifUrl = json.gifUrl;
        obj.needsUpdate = true;

        return obj;
    }
}

export default GifTextureSerializer;
