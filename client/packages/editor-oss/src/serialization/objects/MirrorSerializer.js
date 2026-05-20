import {createMirror} from "@web-shared/object/component/Mirror";
import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";

/**
 * MirrorSerializer — serialize + restore a reflective mirror primitive.
 *
 * The heavy lifting is in `createMirror(options)` which builds the mesh +
 * NodeMaterial + reflector TSL setup. We just persist/restore the
 * constructor options stored in `userData.mirrorConfig`.
 */
class MirrorSerializer extends BaseSerializer {
    toJSON(obj) {
        return Object3DSerializer.prototype.toJSON.call(this, obj);
    }

    fromJSON(json) {
        const config = json?.userData?.mirrorConfig ?? {};
        const obj = createMirror(config);
        Object3DSerializer.prototype.fromJSON.call(this, json, obj);
        return obj;
    }
}

export default MirrorSerializer;
