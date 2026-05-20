
export const requestNextFrame =
    function (callback: ()=>void) {
        setTimeout(callback, 1000 / 120);
    };

export class Clock {
    timestamp: number;

    constructor() {
        this.timestamp = 0;
    }

    getDelta() {
        const time = Date.now();
        if (this.timestamp) {
            const delta = time - this.timestamp;
            this.timestamp = time;
            return delta;
        } else {
            this.timestamp = time;
            return 0;
        }
    }
}

// export const iterateGeometries = (
//     model: Object3D, root: Mesh, includeInvisible: boolean,
//     callback: (vertices: number[][], matrices: number[], indexes: TypedArray | BufferAttribute | null)=>void
// ): Vector3 => {
//     const inverse = new Matrix4();
//     const scale = new Vector3();
//
//     model.updateWorldMatrix(true, false);
//     inverse.copy(model.matrixWorld);
//     // if (boneMatrix) {
//     //     inverse.multiply(boneMatrix);
//     // }
//     inverse.invert();
//     scale.setFromMatrixScale(model.matrixWorld);
//
//     root.traverse((object: Object3D) => {
//         const transform = new Matrix4();
//         let mesh : any = object as Mesh;
//         if ((mesh as Mesh).isMesh && (includeInvisible || (mesh.el && mesh.el.object3D.visible) || mesh.visible)) {
//             mesh.frustumCulled = false;
//             if (mesh === root) {
//                 transform.identity();
//             } else {
//                 mesh.updateWorldMatrix(true, false);
//                 transform.multiplyMatrices(inverse, mesh.matrixWorld);
//             }
//             // todo: might want to return null xform if this is the root so that callers can avoid multiplying
//             // things by the identity matrix
//             callback(
//                 mesh.geometry.isBufferGeometry ? mesh.geometry.attributes.position.array : (mesh.geometry as any).vertices,
//                 transform.elements,
//                 mesh.geometry.index ? mesh.geometry.index.array : null
//             );
//         }
//     });
//     return scale;
// }
