import { Object3D } from 'three';

export const getModelPolygonCount = (model: Object3D) => {
    let polygonCount = 0;

    model.traverse(child => {
        if ((child as any).isMesh) {
            const geometry = (child as any).geometry;
            polygonCount += geometry.index
                ? geometry.index.count / 3
                : geometry.attributes.position.count / 3;
        }
    });

    return polygonCount;
};
