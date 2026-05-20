import * as THREE from "three";
import type {SimplificationParams} from "./edge-collapse";

export class SimpleDecimator {
    simplify(geometry: THREE.BufferGeometry, _params: SimplificationParams): THREE.BufferGeometry {
        return geometry;
    }
}
