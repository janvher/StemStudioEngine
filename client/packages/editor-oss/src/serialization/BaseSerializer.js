import Metadata from "./Metadata";

var ID = -1;

/**
 * Base serializer class
 *
 */
class BaseSerializer {
    constructor() {
        this.id = "BaseSerializer" + ID--;
        this.metadata = Object.assign({}, Metadata, {
            generator: this.constructor.name,
        });
    }

    /**
     * Convert object to JSON
     * @param {Object} obj object
     * @returns {Object} JSON object
     */
    toJSON(obj) {
         
        var json = {
            metadata: this.metadata,
        };
        return json;
    }

    /**
     * Convert JSON to object
     * @param {Object} json JSON object
     * @param {Object} parent parent object
     * @returns {Object} object
     */
    fromJSON(json, parent) {
         
        if (parent) {
            return parent;
        }

        return {};
    }
}

export default BaseSerializer;
