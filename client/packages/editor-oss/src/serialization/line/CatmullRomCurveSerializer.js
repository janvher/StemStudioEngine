import * as THREE from "three";

import CatmullRomCurve from "@web-shared/object/line/CatmullRomCurve";
import BaseSerializer from "../BaseSerializer";
import MeshSerializer from "../core/MeshSerializer";

/**
 * CatmullRomCurveSerializer
 *
 */
class CatmullRomCurveSerializer extends BaseSerializer {
    toJSON(obj) {
        var json = MeshSerializer.prototype.toJSON.call(this, obj);

        return json;
    }

    fromJSON(json, parent) {
        const userData = { ...json.userData };
        userData.points = userData.points.map(n => {
            return new THREE.Vector3().copy(n);
        });

        const jsonCopy = { ...json, userData };

        var obj = parent || new CatmullRomCurve(userData);

        MeshSerializer.prototype.fromJSON.call(this, jsonCopy, obj);

        return obj;
    }
}

export default CatmullRomCurveSerializer;
