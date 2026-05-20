import * as THREE from "three";

export interface RenderableMeshNormalsStats {
    meshesVisited: number;
    geometriesChecked: number;
    normalsComputed: number;
    skippedMissingPosition: number;
    failed: number;
}

function hasValidNormalAttribute(geometry: THREE.BufferGeometry, position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): boolean {
    const normal = geometry.getAttribute("normal");
    return !!normal && normal.itemSize === 3 && normal.count === position.count;
}

export function ensureRenderableMeshNormals(root: THREE.Object3D): RenderableMeshNormalsStats {
    const checkedGeometries = new Set<THREE.BufferGeometry>();
    const stats: RenderableMeshNormalsStats = {
        meshesVisited: 0,
        geometriesChecked: 0,
        normalsComputed: 0,
        skippedMissingPosition: 0,
        failed: 0,
    };

    root.traverse(object => {
        if (!(object as THREE.Mesh).isMesh) return;

        stats.meshesVisited += 1;

        const geometry = (object as THREE.Mesh).geometry;
        if (!geometry?.isBufferGeometry || checkedGeometries.has(geometry)) return;

        checkedGeometries.add(geometry);
        stats.geometriesChecked += 1;

        const position = geometry.getAttribute("position");
        if (!position || position.itemSize !== 3 || position.count < 3) {
            stats.skippedMissingPosition += 1;
            return;
        }

        if (hasValidNormalAttribute(geometry, position)) return;

        try {
            geometry.computeVertexNormals();
            const normal = geometry.getAttribute("normal");
            if (normal) {
                normal.needsUpdate = true;
                stats.normalsComputed += 1;
            }
        } catch (error) {
            stats.failed += 1;
            console.warn("[Render] Failed to compute mesh normals", {
                objectName: object.name,
                objectUuid: object.uuid,
                error,
            });
        }
    });

    return stats;
}
