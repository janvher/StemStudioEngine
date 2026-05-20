import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";

/**
 * BufferGeometrySerializer
 *
 */

const properties = ["groups", "morphAttributes", "name", "parameters", "type", "userData", "uuid"];
class BufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.BufferGeometry();
    toJSON(obj, defaultGeometry) {
        const geometry = defaultGeometry !== undefined ? defaultGeometry : this.defaultGeometry;

        // Use Three.js's built-in toJSON method to properly serialize all geometry data
        // including attributes (position, normal, uv, etc.)
        var json = obj.toJSON();

        // Add our metadata
        json.metadata = this.metadata;

        // For geometries with parameters (primitives), only include if different from default
        properties.forEach(prop => {
            // If no default geometry available, serialize all properties
            if (!geometry || JSON.stringify(obj[prop]) !== JSON.stringify(geometry[prop])) {
                if (obj[prop] !== undefined && json[prop] === undefined) {
                    json[prop] = obj[prop];
                }
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        // Use Three.js's built-in BufferGeometryLoader to properly deserialize
        // all geometry data including attributes
        if (parent === undefined) {
            const loader = new THREE.BufferGeometryLoader();
            const obj = loader.parse(json);

            // Apply additional properties
            properties.forEach(prop => {
                if (json[prop] !== undefined) {
                    obj[prop] = json[prop];
                }
            });

            return obj;
        }

        // If parent is provided, use it
        var obj = parent;
        BaseSerializer.prototype.fromJSON.call(this, json, obj);

        properties.forEach(prop => {
            if (json[prop] !== undefined) {
                obj[prop] = json[prop];
            }
        });

        return obj;
    }
}

export default BufferGeometrySerializer;
