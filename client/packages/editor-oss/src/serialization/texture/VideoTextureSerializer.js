import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TextureSerializer from "./TextureSerializer";

/**
 * VideoTextureSerializer
 *
 */
class VideoTextureSerializer extends BaseSerializer {
    toJSON(obj) {
        const textureSerializer = new TextureSerializer();
        const json = textureSerializer.toJSON(obj, new THREE.Texture());

        if (obj.image instanceof HTMLVideoElement) {
            json.image = {
                tagName: "video",
                src: obj.image.currentSrc || obj.image.src || "",
                width: obj.image.videoWidth,
                height: obj.image.videoHeight,
            };
        }

        return json;
    }

    fromJSON(json, parent, options) {
        const video = document.createElement("video");
        video.src = (options.server || '') + json.image.src;
        video.autoplay = true;
        video.loop = true;
        video.crossOrigin = "anonymous";
        video.muted = true;

        const texture = parent || new THREE.VideoTexture(video);
        TextureSerializer.prototype.fromJSON.call(this, json, texture, options);

        texture.needsUpdate = false;

        super.fromJSON(json, texture, server, true);

        const markReady = () => {
            // only set needsUpdate after video has enough data
            if (video.readyState >= 2) {
                texture.needsUpdate = true;
                video.removeEventListener("loadeddata", markReady);
                video.removeEventListener("canplay", markReady);
            }
        };

        video.addEventListener("loadeddata", markReady);
        video.addEventListener("canplay", markReady);

        return texture;
    }
}

export default VideoTextureSerializer;
