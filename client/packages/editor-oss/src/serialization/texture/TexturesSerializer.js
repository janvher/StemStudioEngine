import * as THREE from "three";

import CanvasTextureSerializer from "./CanvasTextureSerializer";
import CompressedTextureSerializer from "./CompressedTextureSerializer";
import CubeTextureSerializer from "./CubeTextureSerializer";
import DataTextureSerializer from "./DataTextureSerializer";
import DepthTextureSerializer from "./DepthTextureSerializer";
import GifTextureSerializer from "./GifTextureSerializer";
import TextureSerializer from "./TextureSerializer";
import VideoTextureSerializer from "./VideoTextureSerializer";

const Serializers = {
    CanvasTexture: CanvasTextureSerializer,
    CompressedTexture: CompressedTextureSerializer,
    CubeTexture: CubeTextureSerializer,
    DataTexture: DataTextureSerializer,
    DepthTexture: DepthTextureSerializer,
    VideoTexture: VideoTextureSerializer,
    Texture: TextureSerializer,
    _Texture: TextureSerializer,
    Tl: TextureSerializer,
    Te: GifTextureSerializer,
};

/**
 * TexturesSerializer
 *
 */
class TexturesSerializer {
    toJSON(obj) {
        let serializer = Serializers.Texture;

        for (const [key, value] of Object.entries(Serializers)) {
            if (obj instanceof THREE[key]) {
                serializer = value;
                break;
            }
        }
        if (obj.gif?.url) {
            serializer = GifTextureSerializer;
        }

        return new serializer().toJSON(obj);
    }

    fromJSON(json, parent, options) {
        var generator = json.metadata.generator;
        var serializer = Serializers[generator.replace("Serializer", "")];

        if (generator === "GifTextureSerializer") {
            serializer = Serializers.Te;
        }

        if (serializer === undefined) {
            serializer = Serializers.Texture;
        }

        // TextureSerializer expects skipImage and onload in options now
        // Standardize options to include skipImage=false if not present
        const opts = options ?? {};
        const textureOptions = { ...opts, skipImage: opts.skipImage ?? false };
        if (opts.onload) {
            textureOptions.onload = opts.onload;
        }
        
        const texture = new serializer().fromJSON(json, parent, textureOptions);

        return texture;
    }
}

export default TexturesSerializer;
