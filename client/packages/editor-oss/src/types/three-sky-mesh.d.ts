// Minimal type declarations for three/addons/objects/SkyMesh.js until upstream types include it
declare module 'three/addons/objects/SkyMesh.js' {
  import { Mesh, Vector3 } from 'three';
  export class SkyMesh extends Mesh {
    turbidity: { value: number };
    rayleigh: { value: number };
    mieCoefficient: { value: number };
    mieDirectionalG: { value: number };
    sunPosition: { value: Vector3 };
  }
}
