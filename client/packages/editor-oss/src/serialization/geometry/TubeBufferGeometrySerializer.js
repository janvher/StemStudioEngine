import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import BufferGeometrySerializer from "./BufferGeometrySerializer";

/**
 * TubeBufferGeometrySerializer
 *
 */
class TubeBufferGeometrySerializer extends BaseSerializer {
    defaultGeometry = new THREE.TubeGeometry();
    toJSON(obj) {
        return BufferGeometrySerializer.prototype.toJSON.call(this, obj, this.defaultGeometry);
    }

    fromJSON(json, parent) {
        let obj = parent;
        if (json.parameters && !parent) {
            // Deserialize the curve from json.parameters.path
            const pathData = json.parameters.path;
            let curve;

            if (pathData && pathData.type) {
                // Reconstruct curve based on type
                switch (pathData.type) {
                    case "CatmullRomCurve3":
                        const points = pathData.points.map(p => new THREE.Vector3(p[0], p[1], p[2]));
                        curve = new THREE.CatmullRomCurve3(
                            points,
                            pathData.closed,
                            pathData.curveType,
                            pathData.tension,
                        );
                        break;
                    case "CubicBezierCurve3":
                        curve = new THREE.CubicBezierCurve3(
                            new THREE.Vector3().fromArray(pathData.v0),
                            new THREE.Vector3().fromArray(pathData.v1),
                            new THREE.Vector3().fromArray(pathData.v2),
                            new THREE.Vector3().fromArray(pathData.v3),
                        );
                        break;
                    case "QuadraticBezierCurve3":
                        curve = new THREE.QuadraticBezierCurve3(
                            new THREE.Vector3().fromArray(pathData.v0),
                            new THREE.Vector3().fromArray(pathData.v1),
                            new THREE.Vector3().fromArray(pathData.v2),
                        );
                        break;
                    case "LineCurve3":
                        curve = new THREE.LineCurve3(
                            new THREE.Vector3().fromArray(pathData.v1),
                            new THREE.Vector3().fromArray(pathData.v2),
                        );
                        break;
                    default:
                        console.warn(`Unknown curve type: ${pathData.type}`);
                        curve = null;
                }
            }

            if (curve) {
                obj = new THREE.TubeGeometry(
                    curve,
                    json.parameters.tubularSegments,
                    json.parameters.radius,
                    json.parameters.radialSegments,
                    json.parameters.closed,
                );
            } else {
                obj = this.defaultGeometry;
            }
        } else if (!parent) {
            obj = this.defaultGeometry;
        }

        BufferGeometrySerializer.prototype.fromJSON.call(this, json, obj);

        return obj;
    }
}

export default TubeBufferGeometrySerializer;
