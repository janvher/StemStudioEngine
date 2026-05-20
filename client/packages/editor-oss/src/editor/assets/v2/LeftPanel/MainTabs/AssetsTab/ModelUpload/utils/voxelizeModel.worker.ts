/// <reference no-default-lib="true"/>
/// <reference lib="webworker" />
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

// Interfaces for worker message data
interface MeshData {
    positions: Float32Array;
    normals?: Float32Array;
    uvs?: Float32Array;
    vertexColors?: Float32Array;
    indices?: Uint32Array | Uint16Array;
    materialColor: { r: number; g: number; b: number };
    textureData?: {
        width: number;
        height: number;
        data: Uint8ClampedArray;
    };
    matrix: number[]; // 4x4 transformation matrix
}

interface VoxelizeRequest {
    meshes: MeshData[];
    resolution: number;
    removeHiddenFaces?: boolean;
    bbox: {
        min: { x: number; y: number; z: number };
        max: { x: number; y: number; z: number };
    };
}

interface VoxelizeResponse {
    positions: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
}


// Main voxelization function in worker
const voxelizeInWorker = (request: VoxelizeRequest): VoxelizeResponse => {
    const { meshes, resolution, bbox, removeHiddenFaces } = request;
    const bboxMin = new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z);
    const bboxMax = new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z);
    const size = bboxMax.clone().sub(bboxMin);
    const maxDim = Math.max(size.x, size.y, size.z);
    const voxelSize = maxDim / resolution;

    // Recreate Three.js meshes from transferred data
    // Following andstor/voxelizer approach: keep materials with texture maps
    const threeMeshes: THREE.Mesh[] = [];
    const meshColors = new Map<THREE.Mesh, THREE.Color>();
    const meshTextures = new Map<string, { width: number; height: number; data: Uint8ClampedArray }>();

    for (const meshData of meshes) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));

        if (meshData.normals) {
            geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
        }
        if (meshData.uvs) {
            geometry.setAttribute('uv', new THREE.BufferAttribute(meshData.uvs, 2));
        }
        if (meshData.vertexColors) {
            geometry.setAttribute('color', new THREE.BufferAttribute(meshData.vertexColors, 3));
        }
        if (meshData.indices) {
            geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
        }

        // Build BVH for accelerated raycasting
        (geometry as any).boundsTree = new MeshBVH(geometry);

        const materialColor = new THREE.Color(meshData.materialColor.r, meshData.materialColor.g, meshData.materialColor.b);
        const material = new THREE.MeshBasicMaterial({
            color: materialColor,
            side: THREE.DoubleSide,
        });

        // Create a dummy texture map if we have texture data
        // This makes the raycaster compute intersection.uv automatically
        if (meshData.textureData) {
            const textureData = new Uint8Array(meshData.textureData.data.buffer);
            const dataTexture = new THREE.DataTexture(
                textureData,
                meshData.textureData.width,
                meshData.textureData.height,
                THREE.RGBAFormat,
            );
            dataTexture.needsUpdate = true;
            material.map = dataTexture;

            // Store texture data with UUID for lookup (like andstor/voxelizer)
            meshTextures.set(dataTexture.uuid, meshData.textureData);
        }

        const mesh = new THREE.Mesh(geometry, material);

        // Apply transformation matrix
        mesh.matrix.fromArray(meshData.matrix);
        mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
        mesh.updateMatrixWorld(true);

        threeMeshes.push(mesh);
        meshColors.set(mesh, materialColor);
    }

    // Use BVH-accelerated raycast
    const originalRaycast = THREE.Mesh.prototype.raycast.bind(THREE.Mesh.prototype);
    THREE.Mesh.prototype.raycast = acceleratedRaycast;

    // Voxel color map
    const voxelColorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

    const addColorSample = (key: string, color: THREE.Color) => {
        const existing = voxelColorMap.get(key);
        if (existing) {
            existing.r += color.r;
            existing.g += color.g;
            existing.b += color.b;
            existing.count += 1;
        } else {
            voxelColorMap.set(key, { r: color.r, g: color.g, b: color.b, count: 1 });
        }
    };

    // BVH-accelerated raycasting voxelization
    const raycaster = new THREE.Raycaster();

    // Helper to get texel color using nearest-neighbor sampling (like andstor/voxelizer)
    const getTexelColor = (uv: THREE.Vector2, uuid: string): THREE.Color => {
        const texData = meshTextures.get(uuid);
        if (!texData) {
            return new THREE.Color(1, 1, 1);
        }

        const pixels = texData.data;
        const x = Math.floor(uv.x * texData.width);
        const y = Math.floor(uv.y * texData.height);
        const index = (y * texData.width + x) * 4;

        const r = (pixels[index] ?? 0) / 255;
        const g = (pixels[index + 1] ?? 0) / 255;
        const b = (pixels[index + 2] ?? 0) / 255;

        return new THREE.Color(r, g, b);
    };

    // Helper function to extract color from intersection
    // Directly adapted from andstor/voxelizer ColorExtractor.getColorAtIntersect
    const getIntersectionColor = (
        intersection: THREE.Intersection,
        mesh: THREE.Mesh,
    ): THREE.Color => {
        let color = new THREE.Color(); // Defaults to white (1, 1, 1)

        // Sample texture if UV is available (raycaster provides this when material has map)
        if (intersection.uv) {
            const uv = intersection.uv;
            if (!Number.isNaN(uv.x) && !Number.isNaN(uv.y)) {
                const material = mesh.material as THREE.MeshBasicMaterial;

                if (Array.isArray(material)) {
                    material.forEach(m => {
                        if (m.map) {
                            // Apply texture transforms (repeat, offset, rotation)
                            m.map.transformUv(uv);
                            const texelColor = getTexelColor(uv, m.map.uuid);
                            color.multiply(texelColor);
                        }
                    });
                } else {
                    if (material.map) {
                        // Apply texture transforms (repeat, offset, rotation)
                        material.map.transformUv(uv);
                        const texelColor = getTexelColor(uv, material.map.uuid);
                        color.multiply(texelColor);
                    }
                }
            }
        }

        // Multiply by material color (for tinting)
        const material = mesh.material as THREE.MeshBasicMaterial;
        if (Array.isArray(material)) {
            material.forEach(m => {
                if (m.color) {
                    color.multiply(m.color);
                }
            });
        } else {
            if (material.color) {
                color.multiply(material.color);
            }
        }

        return color;
    };

    // Multi-point sampling offsets (center + 4 corners for better color capture)
    const sampleOffsets = [
        { dx: 0.5, dy: 0.5 },   // center
        { dx: 0.25, dy: 0.25 }, // corner 1
        { dx: 0.75, dy: 0.25 }, // corner 2
        { dx: 0.25, dy: 0.75 }, // corner 3
        { dx: 0.75, dy: 0.75 }, // corner 4
    ];

    // Cast rays from 6 directions for complete surface coverage
    const directions = [
        { dir: new THREE.Vector3(0, -1, 0), axis: 'y', positive: false }, // Top to bottom
        { dir: new THREE.Vector3(0, 1, 0), axis: 'y', positive: true },   // Bottom to top
        { dir: new THREE.Vector3(-1, 0, 0), axis: 'x', positive: false }, // Right to left
        { dir: new THREE.Vector3(1, 0, 0), axis: 'x', positive: true },   // Left to right
        { dir: new THREE.Vector3(0, 0, -1), axis: 'z', positive: false }, // Front to back
        { dir: new THREE.Vector3(0, 0, 1), axis: 'z', positive: true },   // Back to front
    ];

    for (const { dir, axis, positive } of directions) {
        for (let i = 0; i < resolution; i++) {
            for (let j = 0; j < resolution; j++) {
                // Multi-point sampling within each voxel cell
                for (const { dx, dy } of sampleOffsets) {
                    let rayOrigin: THREE.Vector3;
                    let coordMap: (distance: number) => { ix: number; iy: number; iz: number };

                    // Set up ray origin and coordinate mapping based on direction
                    if (axis === 'y') {
                        const x = bboxMin.x + (i + dx) * voxelSize;
                        const z = bboxMin.z + (j + dy) * voxelSize;
                        const y = positive ? bboxMin.y - 1 : bboxMax.y + 1;
                        rayOrigin = new THREE.Vector3(x, y, z);
                        coordMap = (distance: number) => {
                            // Move along ray direction: intersection = origin + distance * dir
                            const intersectY = rayOrigin.y + dir.y * distance;
                            const iy = Math.floor((intersectY - bboxMin.y) / voxelSize);
                            return { ix: i, iy, iz: j };
                        };
                    } else if (axis === 'x') {
                        const y = bboxMin.y + (i + dx) * voxelSize;
                        const z = bboxMin.z + (j + dy) * voxelSize;
                        const x = positive ? bboxMin.x - 1 : bboxMax.x + 1;
                        rayOrigin = new THREE.Vector3(x, y, z);
                        coordMap = (distance: number) => {
                            // Move along ray direction: intersection = origin + distance * dir
                            const intersectX = rayOrigin.x + dir.x * distance;
                            const ix = Math.floor((intersectX - bboxMin.x) / voxelSize);
                            return { ix, iy: i, iz: j };
                        };
                    } else { // axis === 'z'
                        const x = bboxMin.x + (i + dx) * voxelSize;
                        const y = bboxMin.y + (j + dy) * voxelSize;
                        const z = positive ? bboxMin.z - 1 : bboxMax.z + 1;
                        rayOrigin = new THREE.Vector3(x, y, z);
                        coordMap = (distance: number) => {
                            // Move along ray direction: intersection = origin + distance * dir
                            const intersectZ = rayOrigin.z + dir.z * distance;
                            const iz = Math.floor((intersectZ - bboxMin.z) / voxelSize);
                            return { ix: i, iy: j, iz };
                        };
                    }

                    raycaster.set(rayOrigin, dir);
                    const intersections = raycaster.intersectObjects(threeMeshes, false);

                    // Consider the first 2-3 intersections for better color capture
                    const maxIntersections = Math.min(3, intersections.length);
                    for (let k = 0; k < maxIntersections; k++) {
                        const intersection = intersections[k];
                        if (!intersection) continue;
                        const intersectedMesh = intersection.object as THREE.Mesh;
                        const { ix, iy, iz } = coordMap(intersection.distance);

                        if (ix >= 0 && ix < resolution && iy >= 0 && iy < resolution && iz >= 0 && iz < resolution) {
                            const voxelColor = getIntersectionColor(intersection, intersectedMesh);
                            addColorSample(`${ix},${iy},${iz}`, voxelColor);
                        }
                    }
                }
            }
        }
    }

    // Restore original raycast
    THREE.Mesh.prototype.raycast = originalRaycast;

    // Clean up meshes
    for (const mesh of threeMeshes) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
        } else {
            mesh.material.dispose();
        }
    }

    // Create voxel geometry
    let positions: Float32Array;
    let colors: Float32Array;
    let indices: Uint32Array;

    if (removeHiddenFaces) {
        const posArray: number[] = [];
        const colArray: number[] = [];
        const idxArray: number[] = [];
        let vertexCount = 0;

        const hasVoxel = (ix: number, iy: number, iz: number) => {
            return voxelColorMap.has(`${ix},${iy},${iz}`);
        };

        const hs = voxelSize / 2;

        voxelColorMap.forEach((colorData, key) => {
            const parts = key.split(',').map(Number) as [number, number, number];
            const [ix, iy, iz] = parts;
            const x = bboxMin.x + (ix + 0.5) * voxelSize;
            const y = bboxMin.y + (iy + 0.5) * voxelSize;
            const z = bboxMin.z + (iz + 0.5) * voxelSize;

            const avgColor = new THREE.Color(
                colorData.r / colorData.count,
                colorData.g / colorData.count,
                colorData.b / colorData.count,
            );

            const faces: Array<{ neighbor: [number, number, number]; verts: [[number, number, number], [number, number, number], [number, number, number], [number, number, number]] }> = [
                { // Right (x+1)
                    neighbor: [ix + 1, iy, iz],
                    verts: [ [hs, -hs, hs], [hs, -hs, -hs], [hs, hs, -hs], [hs, hs, hs] ],
                },
                { // Left (x-1)
                    neighbor: [ix - 1, iy, iz],
                    verts: [ [-hs, -hs, -hs], [-hs, -hs, hs], [-hs, hs, hs], [-hs, hs, -hs] ],
                },
                { // Top (y+1)
                    neighbor: [ix, iy + 1, iz],
                    verts: [ [-hs, hs, hs], [hs, hs, hs], [hs, hs, -hs], [-hs, hs, -hs] ],
                },
                { // Bottom (y-1)
                    neighbor: [ix, iy - 1, iz],
                    verts: [ [-hs, -hs, -hs], [hs, -hs, -hs], [hs, -hs, hs], [-hs, -hs, hs] ],
                },
                { // Front (z+1)
                    neighbor: [ix, iy, iz + 1],
                    verts: [ [-hs, -hs, hs], [hs, -hs, hs], [hs, hs, hs], [-hs, hs, hs] ],
                },
                { // Back (z-1)
                    neighbor: [ix, iy, iz - 1],
                    verts: [ [hs, -hs, -hs], [-hs, -hs, -hs], [-hs, hs, -hs], [hs, hs, -hs] ],
                },
            ];

            for (const face of faces) {
                if (!hasVoxel(face.neighbor[0], face.neighbor[1], face.neighbor[2])) {
                    // Add face vertices
                    for (const v of face.verts) {
                        posArray.push(x + v[0], y + v[1], z + v[2]);
                        colArray.push(avgColor.r, avgColor.g, avgColor.b);
                    }
                    // Add face indices (two triangles)
                    idxArray.push(vertexCount, vertexCount + 1, vertexCount + 2);
                    idxArray.push(vertexCount, vertexCount + 2, vertexCount + 3);
                    vertexCount += 4;
                }
            }
        });

        positions = new Float32Array(posArray);
        colors = new Float32Array(colArray);
        indices = new Uint32Array(idxArray);
    } else {
        const baseGeometry = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize);
        const geometries: THREE.BufferGeometry[] = [];
        const voxelColors: THREE.Color[] = [];

        voxelColorMap.forEach((colorData, key) => {
            const parts2 = key.split(',').map(Number) as [number, number, number];
            const [ix, iy, iz] = parts2;
            const x = bboxMin.x + (ix + 0.5) * voxelSize;
            const y = bboxMin.y + (iy + 0.5) * voxelSize;
            const z = bboxMin.z + (iz + 0.5) * voxelSize;

            const avgColor = new THREE.Color(
                colorData.r / colorData.count,
                colorData.g / colorData.count,
                colorData.b / colorData.count,
            );

            const geometry = baseGeometry.clone();
            geometry.translate(x, y, z);
            geometries.push(geometry);
            voxelColors.push(avgColor);
        });

        // Merge geometries
        const mergedGeometry = mergeGeometries(geometries, false);

        // Clean up
        geometries.forEach(g => g.dispose());
        baseGeometry.dispose();

        if (!mergedGeometry) {
            throw new Error('Failed to merge geometries');
        }

        // Add vertex colors
        const verticesPerBox = 24;
        const colorArray = new Float32Array(voxelColors.length * verticesPerBox * 3);

        voxelColors.forEach((color, boxIndex) => {
            for (let i = 0; i < verticesPerBox; i++) {
                const idx = (boxIndex * verticesPerBox + i) * 3;
                colorArray[idx] = color.r;
                colorArray[idx + 1] = color.g;
                colorArray[idx + 2] = color.b;
            }
        });

        mergedGeometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        // Extract buffer data for transfer
        positions = mergedGeometry.attributes['position']!.array as Float32Array;
        colors = mergedGeometry.attributes['color']!.array as Float32Array;
        indices = mergedGeometry.index ? (mergedGeometry.index.array as Uint32Array) : new Uint32Array(0);

        // Dispose merged geometry
        mergedGeometry.dispose();
    }

    return {
        positions,
        colors,
        indices,
    };
};

// Worker message handler
addEventListener('message', (event: MessageEvent<VoxelizeRequest>) => {
    try {
        const result = voxelizeInWorker(event.data);

        // Transfer buffers for zero-copy performance
        postMessage(result, [
            result.positions.buffer,
            result.colors.buffer,
            result.indices.buffer,
        ]);
    } catch (error) {
        postMessage({ error: error instanceof Error ? error.message : String(error) });
    }
});
