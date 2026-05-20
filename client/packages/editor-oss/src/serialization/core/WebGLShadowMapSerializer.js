import BaseSerializer from "../BaseSerializer";
/**
 * WebGLShadowMapSerializer
 *
 */

const properties = ["autoUpdate", "enabled", "type"];
class WebGLShadowMapSerializer extends BaseSerializer {
    toJSON(obj, defaultShadowMap) {
        var json = BaseSerializer.prototype.toJSON.call(this, obj);

        properties.forEach(n => {
            if (defaultShadowMap[n] !== obj[n]) {
                json[n] = obj[n];
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        if (parent === undefined) {
            console.warn(`WebGLShadowMapSerializer: parent is empty.`);
            return null;
        }

        var obj = parent;

        properties.forEach(n => {
            if (json[n] !== undefined) {
                obj[n] = json[n];
            }
        });

        obj.needsUpdate = true;

        return obj;
    }
}

export default WebGLShadowMapSerializer;
