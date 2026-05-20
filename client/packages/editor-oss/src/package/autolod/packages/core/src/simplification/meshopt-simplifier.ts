import * as THREE from "three";
import type {SimplificationParams} from "./edge-collapse";

export class MeshoptSimplifierWrapper {
    async simplify(geometry: THREE.BufferGeometry, _params: SimplificationParams): Promise<THREE.BufferGeometry> {
        return geometry;
    }
}
