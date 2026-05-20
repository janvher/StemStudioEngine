import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";

/**
 * GeometrySerializer
 *
 */
const properties = [
    "type",
    "boundingBox",
    "boundingSphere",
    "colors",
    "colorsNeedUpdate",
    "faces",
    "faceVertexUvs",
    "groupsNeedUpdate",
    "isGeometry",
    "lineDistances",
    "lineDistancesNeedUpdate",
    "morphTargets",
    "morphNormals",
    "name",
    "normalsNeedUpdate",
    "parameters",
    "skinWeights",
    "skinIndices",
    "uuid",
    "vertices",
    "verticesNeedUpdate",
    "elementsNeedUpdate",
    "uvsNeedUpdate",
    "normalsNeedUpdate",
];
class GeometrySerializer extends BaseSerializer {
    toJSON(obj, defaultGeometry) {
        const geometry = defaultGeometry ? defaultGeometry : new THREE.BufferGeometry();
        var json = BaseSerializer.prototype.toJSON.call(this, obj);

        properties.forEach(prop => {
            if (JSON.stringify(obj[prop]) !== JSON.stringify(geometry[prop])) {
                json[prop] = obj[prop];
            }
        });

        return json;
    }

    fromJSON(json, parent) {
        var obj = parent === undefined ? new THREE.BufferGeometry() : parent;

        BaseSerializer.prototype.fromJSON.call(this, obj);

        properties.forEach(prop => {
            if (json[prop] !== undefined) {
                obj[prop] = json[prop];
            }
        });

        return obj;
    }
}

export default GeometrySerializer;
