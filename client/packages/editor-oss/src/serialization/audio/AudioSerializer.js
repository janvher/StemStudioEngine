import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";

/**
 * AudioSerializer
 *
 */

const AUDIO_LISTENER = new THREE.AudioListener();
const DEFAULT_OBJECT = new THREE.Audio(AUDIO_LISTENER);
class AudioSerializer extends BaseSerializer {
    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj, DEFAULT_OBJECT);

        json.autoplay = obj.autoplay;
        json.loop = obj.getLoop();
        json.volume = obj.getVolume();

        return json;
    }

    fromJSON(json, parent, options) {
        const audioListener = options.audioListener;
        if (audioListener === undefined) {
            this.audioListener = audioListener;
        }
        var obj = parent === undefined ? new THREE.Audio(this.audioListener) : parent;

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        obj.autoplay = json.autoplay;
        obj.setLoop(json.loop);
        obj.setVolume(json.volume);

        return obj;
    }
}

export default AudioSerializer;
