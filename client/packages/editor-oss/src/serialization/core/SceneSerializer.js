
/**
 * Module: SceneSerializer.js
 * Purpose: Contains logic for scene serializer.
 */


import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "./Object3DSerializer";
import ShadowUtils from "@web-shared/utils/ShadowUtils";
import MaterialsSerializer from "../material/MaterialsSerializer";
import TexturesSerializer from "../texture/TexturesSerializer";

/**
 * SceneSerializer
 *
 */
class SceneSerializer extends BaseSerializer {
    defaultObject = new THREE.Scene();

    constructor() {
        super();
        this.defaultObject.name = 'DefaultSceneSerializerScene';
    }

    toJSON(obj) {
        var json = Object3DSerializer.prototype.toJSON.call(this, obj, this.defaultObject);

        // NOTE: Disabled background serialization to avoid issues with backgrounds that are set via EnvironmentSettingsManager
        // if (obj.background instanceof THREE.Texture) {

        //     json.background = new TexturesSerializer().toJSON(obj.background);
        // } else {

        //     json.background = obj.background;
        // }

        json.fog = obj.fog;
        json.overrideMaterial = !obj.overrideMaterial ? null : new MaterialsSerializer().toJSON(obj.overrideMaterial);

        return json;
    }

    fromJSON(json, parent, options) {
        var obj = parent === undefined ? this.defaultObject : parent;

        Object3DSerializer.prototype.fromJSON(json, obj);

        if (
            json.background &&
            json.background.metadata &&
            (json.background.metadata.generator === "CubeTextureSerializer" ||
                json.background.metadata.generator === "TextureSerializer")
        ) {

            obj.background = new TexturesSerializer().fromJSON(json.background, undefined, options);
        } else if (json.background) {

            obj.background = new THREE.Color(json.background);
        }

        if (json.fog && (json.fog.type === "Fog" || json.fog instanceof THREE.Fog)) {
            obj.fog = new THREE.Fog(json.fog.color, json.fog.near, json.fog.far);
        } else if (json.fog && (json.fog.type === "FogExp2" || json.fog instanceof THREE.FogExp2)) {
            obj.fog = new THREE.FogExp2(json.fog.color, json.fog.density);
        } else if (json.fog) {
            console.warn(`SceneSerializer: unknown fog type ${json.fog.type}.`);
        }

        obj.overrideMaterial = !json.overrideMaterial
            ? null
            : new MaterialsSerializer().fromJSON(json.overrideMaterial, undefined, options);

        ShadowUtils.applyShadowSettings(obj, json);
        ShadowUtils.applyFogSettings(obj, json);
        return obj;
    }
}

export default SceneSerializer;
