import BaseSerializer from "../BaseSerializer";
import LightSerializer from "./LightSerializer";
import {ExtendedDirectionalLight} from "@web-shared/light/ExtendedDirectionalLight";

/**
 * DirectionalLightSerializer
 *
 */

const propertiesFrom = ["color", "intensity"];
class DirectionalLightSerializer extends BaseSerializer {
    defaultLight = new ExtendedDirectionalLight();

    toJSON(obj) {
        var json = LightSerializer.prototype.toJSON.call(this, obj, this.defaultLight);

        return json;
    }

    fromJSON(json, parent) {
        const config = { ...json };
        propertiesFrom.forEach(prop => {
            if (config[prop] === undefined) {
                config[prop] = this.defaultLight[prop];
            }
        });

        var obj = parent === undefined ? new ExtendedDirectionalLight(config.color, config.intensity) : parent;

        LightSerializer.prototype.fromJSON.call(this, config, obj);

        obj.isDirectionalLight = true;
        return obj;
    }
}

export default DirectionalLightSerializer;
