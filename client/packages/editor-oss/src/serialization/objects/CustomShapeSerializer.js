import CustomShape from "@web-shared/object/geometry/CustomShape";
import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";
import GeometriesSerializer from "../geometry/GeometriesSerializer";
import MaterialsSerializer from "../material/MaterialsSerializer";

/**
 * CustomShapeSerializer
 * Serializes/deserializes CustomShape objects with SVG path data
 */
class CustomShapeSerializer extends BaseSerializer {
    toJSON(obj, options = {}) {
        const json = Object3DSerializer.prototype.toJSON.call(this, obj);

        json.geometry = new GeometriesSerializer().toJSON(obj.geometry);

        if (options.saveMaterial) {
            json.material = new MaterialsSerializer().toJSON(obj.material);
        } else {
            json.material = null;
        }

        // Store the SVG path from userData
        json.svgPath = obj.userData.svgPath;

        return json;
    }

    fromJSON(json, parent, options) {
        if (parent !== undefined) {
            Object3DSerializer.prototype.fromJSON.call(this, json, parent);
            return parent;
        }

        // Reconstruct CustomShape with SVG path
        const svgPath = json.svgPath || json.userData?.svgPath;

        // Don't deserialize geometry - recreate it from SVG path instead
        // The CustomShape constructor will create the geometry from the SVG path
        const material = json.material
            ? new MaterialsSerializer().fromJSON(json.material, undefined, options)
            : undefined;

        const obj = new CustomShape(svgPath, undefined, material);

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default CustomShapeSerializer;
