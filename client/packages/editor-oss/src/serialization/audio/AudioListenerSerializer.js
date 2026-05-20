import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";

/**
 * AudioListenerSerializer
 *
 */
class AudioListenerSerializer extends BaseSerializer {
    defaultObject = new THREE.AudioListener();
    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);

        json.masterVolume = obj.getMasterVolume();

        return json;
    }

    fromJSON(json, parent) {
        var obj = parent === undefined ? this.defaultObject : parent;

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        obj.setMasterVolume(json.masterVolume);

        return obj;
    }
}

export default AudioListenerSerializer;
