import * as THREE from "three";

import CustomTube from "@web-shared/object/geometry/CustomTube";
import BaseSerializer from "../BaseSerializer";
import Object3DSerializer from "../core/Object3DSerializer";
import GeometriesSerializer from "../geometry/GeometriesSerializer";
import MaterialsSerializer from "../material/MaterialsSerializer";

/**
 * CustomTubeSerializer
 * Serializes/deserializes CustomTube objects with curve data
 */
class CustomTubeSerializer extends BaseSerializer {
    toJSON(obj, options = {}) {
        const json = Object3DSerializer.prototype.toJSON.call(this, obj);

        json.geometry = new GeometriesSerializer().toJSON(obj.geometry);

        if (options.saveMaterial) {
            json.material = new MaterialsSerializer().toJSON(obj.material);
        } else {
            json.material = null;
        }

        // Store the curve parameters from userData
        json.curvePoints = obj.userData.curvePoints;
        json.curveType = obj.userData.curveType;
        json.tubularSegments = obj.userData.tubularSegments;
        json.radius = obj.userData.radius;
        json.radialSegments = obj.userData.radialSegments;
        json.closed = obj.userData.closed;
        json.extrudeDepth = obj.userData.extrudeDepth;

        return json;
    }

    fromJSON(json, parent, options) {
        if (parent !== undefined) {
            Object3DSerializer.prototype.fromJSON.call(this, json, parent);
            return parent;
        }

        // Reconstruct curve points from serialized data
        const curvePointsData = json.curvePoints || json.userData?.curvePoints || [];
        const curvePoints = curvePointsData.map(p => new THREE.Vector3(p.x, p.y, p.z));

        const curveType = json.curveType || json.userData?.curveType;
        const tubularSegments = json.tubularSegments || json.userData?.tubularSegments || 64;
        const radius = json.radius || json.userData?.radius || 0.2;
        const radialSegments = json.radialSegments || json.userData?.radialSegments || 8;
        const closed = json.closed ?? json.userData?.closed ?? false;
        const extrudeDepth = json.extrudeDepth || json.userData?.extrudeDepth || 0;

        // Don't deserialize geometry - recreate it from parameters instead
        // The CustomTube constructor will create the geometry from curve points
        const material = json.material
            ? new MaterialsSerializer().fromJSON(json.material, undefined, server)
            : undefined;

        const obj = new CustomTube(
            curvePoints,
            curveType,
            tubularSegments,
            radius,
            radialSegments,
            closed,
            extrudeDepth,
            undefined, // Let constructor create geometry from parameters
            material,
        );

        Object3DSerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default CustomTubeSerializer;
