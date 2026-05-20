import * as THREE from "three";

export interface SimplificationParams {
    targetRatio: number;
    preserveUVs?: boolean;
    preserveNormals?: boolean;
    preserveColors?: boolean;
}

export class EdgeCollapseSimplifier {
    simplify(geometry: THREE.BufferGeometry, _params: SimplificationParams): THREE.BufferGeometry {
        return geometry;
    }
}
