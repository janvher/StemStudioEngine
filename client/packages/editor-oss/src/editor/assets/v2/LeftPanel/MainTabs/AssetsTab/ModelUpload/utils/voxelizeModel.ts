import * as THREE from 'three';

import VoxelizeWorker from './voxelizeModel.worker.ts?worker';

// Interfaces for worker communication
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
    matrix: number[];
}

interface VoxelizeRequest {
    meshes: MeshData[];
    resolution: number;
    removeHiddenFaces: boolean;
    bbox: {
        min: { x: number; y: number; z: number };
        max: { x: number; y: number; z: number };
    };
}

interface VoxelizeResponse {
    positions: Float32Array;
    colors: Float32Array;
    indices: Uint32Array;
    error?: string;
}

/**
 * Extract texture data as Uint8ClampedArray for transfer to worker
 * @param material - The material to extract texture data from
 * @returns Texture data or undefined if no texture
 */
const extractTextureData = (
    material: THREE.Material,
): { width: number; height: number; data: Uint8ClampedArray } | undefined => {
    const mat = material as any;

    if (!mat.map?.image) {
        return undefined;
    }

    try {
        const img = mat.map.image;

        // Check if it's a valid drawable type for OffscreenCanvasRenderingContext2D.drawImage()
        const isValidDrawable =
            img instanceof HTMLImageElement ||
            img instanceof HTMLCanvasElement ||
            img instanceof HTMLVideoElement ||
            img instanceof ImageBitmap ||
            typeof OffscreenCanvas !== 'undefined' && img instanceof OffscreenCanvas ||
            typeof VideoFrame !== 'undefined' && img instanceof VideoFrame;

        if (!isValidDrawable) {
            return undefined;
        }

        const width = 'width' in img ? img.width : 256;
        const height = 'height' in img ? img.height : 256;

        if (!width || !height) {
            return undefined;
        }

        // Create an offscreen canvas to extract pixel data
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return undefined;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, width, height);

        return {
            width,
            height,
            data: imageData.data,
        };
    } catch (error) {
        console.warn('Failed to extract texture data:', error);
        return undefined;
    }
};

/**
 * Extract color from material
 * @param material
 */
const getMaterialColor = (material: THREE.Material): THREE.Color => {
    const mat = material as any;

    if (mat.color && mat.color instanceof THREE.Color) {
        return mat.color.clone();
    }

    if (mat.emissive && mat.emissive instanceof THREE.Color) {
        const emissive = mat.emissive.clone();
        if (emissive.r > 0 || emissive.g > 0 || emissive.b > 0) {
            return emissive;
        }
    }

    return new THREE.Color(1, 1, 1);
};

/**
 * Voxelizes a 3D model using BVH-accelerated raycast algorithm in a Web Worker
 *
 * This prevents UI blocking by offloading the CPU-intensive voxelization to a background thread.
 *
 * Algorithm (based on andstor/voxelizer):
 * 1. Extract geometry, materials, and texture data from the model
 * 2. Transfer data to worker thread
 * 3. Worker builds BVH (Bounding Volume Hierarchy) for each mesh - O(n log n)
 * 4. Worker casts rays through 3D grid with BVH acceleration - O(resolution² × log(triangles))
 * 5. Worker counts intersections: odd = inside, even = outside
 * 6. Returns merged geometry with vertex colors
 *
 * BVH acceleration reduces raycast from O(triangles) to O(log(triangles)) per ray!
 * This makes it 10-100x faster than naive raycasting.
 *
 * Reference: https://github.com/andstor/voxelizer
 *
 * @param model - The Three.js Object3D to voxelize
 * @param resolution - The voxel resolution (higher = more detail, recommended 16-48)
 * @param removeHiddenFaces - Whether to remove hidden faces (internal voxels)
 * @returns A promise that resolves to a new Three.js Mesh with voxelized geometry
 */
export const voxelizeModel = async (
    model: THREE.Object3D,
    resolution: number = 32,
    removeHiddenFaces: boolean = true,
): Promise<THREE.Object3D> => {
    // Ensure the model's world matrix is up to date
    model.updateMatrixWorld(true);

    // Get bounding box of the model
    const bbox = new THREE.Box3().setFromObject(model);

    // Collect all meshes and extract their data
    const meshDataPromises: Promise<MeshData>[] = [];

    model.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
            const mesh = child;
            const geometry = mesh.geometry;

            // Clone geometry to ensure we have BufferGeometry with proper attributes
            const geom = geometry.clone();
            if (!geom.attributes.position) {
                return;
            }

            const positions = geom.attributes.position.array as Float32Array;
            const normals = geom.attributes.normal?.array as Float32Array | undefined;
            const uvs = geom.attributes.uv?.array as Float32Array | undefined;
            const vertexColors = geom.attributes.color?.array as Float32Array | undefined;
            const indices = geom.index?.array as Uint32Array | Uint16Array | undefined;

            // Get material color
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            const material = materials[0];
            const materialColor = getMaterialColor(material);

            // Extract transformation matrix
            const matrix = mesh.matrixWorld.toArray();

            // Extract texture data
            const textureData = extractTextureData(material);

            // Clean up cloned geometry
            geom.dispose();

            const meshData: MeshData = {
                positions: new Float32Array(positions),
                normals: normals ? new Float32Array(normals) : undefined,
                uvs: uvs ? new Float32Array(uvs) : undefined,
                vertexColors: vertexColors ? new Float32Array(vertexColors) : undefined,
                indices: indices ?
                    indices instanceof Uint32Array ? new Uint32Array(indices) : new Uint16Array(indices)
                 : undefined,
                materialColor: {
                    r: materialColor.r,
                    g: materialColor.g,
                    b: materialColor.b,
                },
                textureData,
                matrix,
            };

            meshDataPromises.push(Promise.resolve(meshData));
        }
    });

    // Wait for all mesh data to be extracted
    const meshes = await Promise.all(meshDataPromises);

    if (meshes.length === 0) {
        throw new Error('No meshes found in model');
    }

    // Prepare request for worker
    const request: VoxelizeRequest = {
        meshes,
        resolution,
        removeHiddenFaces,
        bbox: {
            min: { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z },
            max: { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z },
        },
    };

    // Create and execute worker
    return new Promise<THREE.Object3D>((resolve, reject) => {
        const worker = new VoxelizeWorker();

        worker.onmessage = (event: MessageEvent<VoxelizeResponse>) => {
            worker.terminate();

            if (event.data.error) {
                reject(new Error(event.data.error));
                return;
            }

            const { positions, colors, indices } = event.data;

            // Reconstruct geometry from worker response
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            if (indices.length > 0) {
                geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            }

            // Create material that uses vertex colors
            const material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.7,
                metalness: 0.3,
                flatShading: true,
            });

            const voxelMesh = new THREE.Mesh(geometry, material);
            voxelMesh.name = 'VoxelizedModel';

            resolve(voxelMesh);
        };

        worker.onerror = (error) => {
            worker.terminate();
            reject(new Error(`Voxelization worker error: ${error.message}`));
        };

        // Collect all transferable buffers
        const transferables: Transferable[] = [];
        meshes.forEach(mesh => {
            transferables.push(mesh.positions.buffer);
            if (mesh.normals) transferables.push(mesh.normals.buffer);
            if (mesh.uvs) transferables.push(mesh.uvs.buffer);
            if (mesh.vertexColors) transferables.push(mesh.vertexColors.buffer);
            if (mesh.indices) transferables.push(mesh.indices.buffer);
            if (mesh.textureData) transferables.push(mesh.textureData.data.buffer);
        });

        // Send work to worker with transferable buffers for zero-copy performance
        worker.postMessage(request, transferables);
    });
};
