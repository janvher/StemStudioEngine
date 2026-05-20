import * as THREE from "three";

import global from "@web-shared/global";
import ShadowUtils from "@web-shared/utils/ShadowUtils";
import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";
import LightShadowsSerializer from "./shadow/LightShadowsSerializer";

/**
 * LightSerializer
 *
 */

const properties = ["color", "intensity"];
class LightSerializer extends BaseSerializer {
    toJSON(obj, defaultLight) {
        const light = defaultLight ? defaultLight : new THREE.Light();
        var json = Object3DSerializer.prototype.toJSON.call(this, obj);

        properties.forEach(prop => {
            if (obj[prop] === light[prop]) {
                delete json[prop];
            } else {
                json[prop] = obj[prop];
            }
        });

        if (obj.shadow) {
            json.shadow = new LightShadowsSerializer().toJSON(obj.shadow, defaultLight);
        }

        if (obj.target) {
            json.target = Object3DSerializer.prototype.toJSON.call(this, obj.target);
        }

        // Support ExtendedDirectionalLight
        if (obj.isExtendedDirectionalLight) {
            json.isUnityStyle = obj.isUnityStyle;
        }

        return json;
    }

    fromJSON(json, parent) {
        var obj = parent;

        // TODO: temporary remove physics from light source
        if (json.userData?.physics) {
            delete json.userData.physics;
        }

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        if (json.color) obj.color = new THREE.Color(json.color);
        if (obj.intensity) obj.intensity = json.intensity;

        if (json.target) {
            obj.target = Object3DSerializer.prototype.fromJSON.call(this, json.target, obj.target);
        }

        if (json.shadow) {
            new LightShadowsSerializer().fromJSON(json.shadow, obj);
        }

        // Support ExtendedDirectionalLight
        if (obj.isExtendedDirectionalLight && typeof json.isUnityStyle === 'boolean') {
            obj.isUnityStyle = json.isUnityStyle;
            // The isUnityStyle setter recalculates quaternion from target position.
            // Restore the serialized quaternion so it takes precedence.
            if (json.quaternion) {
                obj.quaternion.copy(json.quaternion);
            }
        }

        obj.isLight = true;

        if (obj.castShadow && global.app && global.app.editor && global.app.editor.scene) {
            ShadowUtils.checkShadowCastingLights(global.app.editor.scene, obj);
        }

        return obj;
    }
}

export default LightSerializer;
