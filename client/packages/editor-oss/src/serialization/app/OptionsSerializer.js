import BaseSerializer from "../BaseSerializer";

/**
 * OptionsSerializer
 *
 */

const fieldsToOmit = ["_id", "metadata", "server", "isPlayModeOnly"];
class OptionsSerializer extends BaseSerializer {
    toJSON(obj) {
        var json = BaseSerializer.prototype.toJSON.call(this, obj);

        Object.keys(obj).forEach(n => {
            if (n === "defaultValues") {
                return;
            } else if (!obj.defaultValues || JSON.stringify(obj[n]) !== JSON.stringify(obj.defaultValues[n])) {
                json[n] = obj[n];
            } else if (n === "server") {
                // Always serialize server config
                json[n] = obj[n];
            }
        });

        return json;
    }

    fromJSON(json) {
        var obj = {};

        Object.keys(json).forEach(n => {
            if (fieldsToOmit.includes(n)) {
                return;
            }
            obj[n] = json[n];
        });

        return obj;
    }
}

export default OptionsSerializer;
