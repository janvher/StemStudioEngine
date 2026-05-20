
import {
    BufferGeometry,
    Color,
    FileLoader,
    Float32BufferAttribute,
    Group,
    Loader,
    LoaderUtils,
    Mesh,
    MeshPhongMaterial,
} from 'three';

import BaseLoader from './BaseLoader';

// 3DS file chunk IDs
const CHUNK_MAIN = 0x4D4D;
const CHUNK_VERSION = 0x0002;
const CHUNK_SCENE = 0x3D3D;
const CHUNK_MATERIAL = 0xAFFF;
const CHUNK_OBJECT = 0x4000;
const CHUNK_MESH = 0x4100;
const CHUNK_VERTICES = 0x4110;
const CHUNK_FACES = 0x4120;
const CHUNK_TEXCOORDS = 0x4140;
const CHUNK_MESH_MATRIX = 0x4160;
const CHUNK_MATERIAL_NAME = 0xA000;
const CHUNK_MATERIAL_AMBIENT = 0xA010;
const CHUNK_MATERIAL_DIFFUSE = 0xA020;
const CHUNK_MATERIAL_SPECULAR = 0xA030;
const CHUNK_MATERIAL_SHININESS = 0xA040;
const CHUNK_MATERIAL_TRANSPARENCY = 0xA050;
const CHUNK_MATERIAL_TEXTURE = 0xA200;
const CHUNK_RGB = 0x0010;
const CHUNK_RGB24 = 0x0011;
const CHUNK_LIN_RGB = 0x0012;
const CHUNK_LIN_RGB24 = 0x0013;
const CHUNK_PERCENT_INT = 0x0030;
const CHUNK_PERCENT_FLOAT = 0x0031;

class TDSLoaderImpl extends Loader {
    constructor(manager) {
        super(manager);
        this.debug = false;
        this.materials = {};
        this.meshes = [];
    }

    load(url, onLoad, onProgress, onError) {
        const scope = this;
        const path = LoaderUtils.extractUrlBase(url);

        const loader = new FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);

        loader.load(url, function (data) {
            try {
                onLoad(scope.parse(data, path));
            } catch (e) {
                if (onError) {
                    onError(e);
                } else {
                    console.error(e);
                }
                scope.manager.itemError(url);
            }
        }, onProgress, onError);
    }

    parse(buffer) {
        const group = new Group();
        const data = new DataView(buffer);
        let offset = 0;

        // Reset state
        this.materials = {};
        this.meshes = [];

        // Read main chunk
        const mainChunk = this.readChunk(data, offset);
        if (mainChunk.id !== CHUNK_MAIN) {
            console.error('TDSLoader: Not a valid 3DS file');
            return group;
        }

        offset = 6; // Skip main chunk header

        // Process sub-chunks
        while (offset < mainChunk.size) {
            const chunk = this.readChunk(data, offset);

            switch (chunk.id) {
                case CHUNK_VERSION: {
                    const version = data.getUint32(offset + 6, true);
                    if (this.debug) console.log('3DS Version:', version);
                    break;
                }

                case CHUNK_SCENE:
                    this.parseScene(data, offset + 6, chunk.size - 6);
                    break;
            }

            offset += chunk.size;
        }

        // Build the final group
        this.buildMeshes(group);

        return group;
    }

    parseScene(data, offset, size) {
        const end = offset + size;

        while (offset < end) {
            const chunk = this.readChunk(data, offset);

            switch (chunk.id) {
                case CHUNK_MATERIAL:
                    this.parseMaterial(data, offset + 6, chunk.size - 6);
                    break;

                case CHUNK_OBJECT:
                    this.parseObject(data, offset + 6, chunk.size - 6);
                    break;
            }

            offset += chunk.size;
        }
    }

    parseMaterial(data, offset, size) {
        const material = {
            name: '',
            ambient: new Color(0x000000),
            diffuse: new Color(0xffffff),
            specular: new Color(0x000000),
            shininess: 0,
            transparency: 0,
            texture: null,
        };

        const end = offset + size;

        while (offset < end) {
            const chunk = this.readChunk(data, offset);

            switch (chunk.id) {
                case CHUNK_MATERIAL_NAME:
                    material.name = this.readString(data, offset + 6);
                    break;

                case CHUNK_MATERIAL_AMBIENT:
                    material.ambient = this.readColor(data, offset + 6);
                    break;

                case CHUNK_MATERIAL_DIFFUSE:
                    material.diffuse = this.readColor(data, offset + 6);
                    break;

                case CHUNK_MATERIAL_SPECULAR:
                    material.specular = this.readColor(data, offset + 6);
                    break;

                case CHUNK_MATERIAL_SHININESS:
                    material.shininess = this.readPercent(data, offset + 6);
                    break;

                case CHUNK_MATERIAL_TRANSPARENCY:
                    material.transparency = this.readPercent(data, offset + 6);
                    break;

                case CHUNK_MATERIAL_TEXTURE:
                    material.texture = this.readTexture(data, offset + 6, chunk.size - 6);
                    break;
            }

            offset += chunk.size;
        }

        if (material.name) {
            this.materials[material.name] = material;
        }
    }

    parseObject(data, offset, size) {
        const name = this.readString(data, offset);
        offset += name.length + 1;

        const remaining = size - name.length - 1;
        const end = offset + remaining;

        while (offset < end) {
            const chunk = this.readChunk(data, offset);

            if (chunk.id === CHUNK_MESH) {
                const mesh = this.parseMesh(data, offset + 6, chunk.size - 6);
                mesh.name = name;
                this.meshes.push(mesh);
            }

            offset += chunk.size;
        }
    }

    parseMesh(data, offset, size) {
        const mesh = {
            vertices: [],
            faces: [],
            uvs: [],
            materials: [],
            matrix: null,
        };

        const end = offset + size;

        while (offset < end) {
            const chunk = this.readChunk(data, offset);

            switch (chunk.id) {
                case CHUNK_VERTICES:
                    mesh.vertices = this.readVertices(data, offset + 6);
                    break;

                case CHUNK_FACES: {
                    const facesData = this.readFaces(data, offset + 6, chunk.size - 6);
                    mesh.faces = facesData.faces;
                    mesh.materials = facesData.materials;
                    break;
                }

                case CHUNK_TEXCOORDS:
                    mesh.uvs = this.readTexCoords(data, offset + 6);
                    break;

                case CHUNK_MESH_MATRIX:
                    mesh.matrix = this.readMatrix(data, offset + 6);
                    break;
            }

            offset += chunk.size;
        }

        return mesh;
    }

    readChunk(data, offset) {
        return {
            id: data.getUint16(offset, true),
            size: data.getUint32(offset + 2, true),
        };
    }

    readString(data, offset) {
        let str = '';
        let byte;
        while ((byte = data.getUint8(offset++)) !== 0) {
            str += String.fromCharCode(byte);
        }
        return str;
    }

    readColor(data, offset) {
        const chunk = this.readChunk(data, offset);
        offset += 6;

        switch (chunk.id) {
            case CHUNK_RGB:
            case CHUNK_LIN_RGB:
                return new Color(
                    data.getFloat32(offset, true),
                    data.getFloat32(offset + 4, true),
                    data.getFloat32(offset + 8, true),
                );

            case CHUNK_RGB24:
            case CHUNK_LIN_RGB24:
                return new Color(
                    data.getUint8(offset) / 255,
                    data.getUint8(offset + 1) / 255,
                    data.getUint8(offset + 2) / 255,
                );

            default:
                return new Color();
        }
    }

    readPercent(data, offset) {
        const chunk = this.readChunk(data, offset);
        offset += 6;

        switch (chunk.id) {
            case CHUNK_PERCENT_INT:
                return data.getUint16(offset, true) / 100;

            case CHUNK_PERCENT_FLOAT:
                return data.getFloat32(offset, true);

            default:
                return 0;
        }
    }

    readTexture(data, offset, size) {
        // Simplified texture reading
        const texture = {};
        const end = offset + size;

        while (offset < end) {
            const chunk = this.readChunk(data, offset);

            // Look for filename chunk (0xA300)
            if (chunk.id === 0xA300) {
                texture.filename = this.readString(data, offset + 6);
            }

            offset += chunk.size;
        }

        return texture;
    }

    readVertices(data, offset) {
        const count = data.getUint16(offset, true);
        offset += 2;

        const vertices = [];

        for (let i = 0; i < count; i++) {
            vertices.push(
                data.getFloat32(offset, true),
                data.getFloat32(offset + 8, true),  // Y and Z are swapped in 3DS
                data.getFloat32(offset + 4, true),
            );
            offset += 12;
        }

        return vertices;
    }

    readFaces(data, offset, size) {
        const count = data.getUint16(offset, true);
        offset += 2;

        const faces = [];
        const materials = [];

        for (let i = 0; i < count; i++) {
            const a = data.getUint16(offset, true);
            const b = data.getUint16(offset + 2, true);
            const c = data.getUint16(offset + 4, true);
            // Byte offset 6 holds the face edge-visibility flags, unused here.

            faces.push(a, b, c);
            offset += 8;
        }

        // Read material groups
        while (offset < size) {
            const chunk = this.readChunk(data, offset);

            if (chunk.id === 0x4130) { // Material group
                const name = this.readString(data, offset + 6);
                const faceCount = data.getUint16(offset + 6 + name.length + 1, true);

                offset += 6 + name.length + 1 + 2;

                for (let i = 0; i < faceCount; i++) {
                    const faceIndex = data.getUint16(offset, true);
                    materials[faceIndex] = name;
                    offset += 2;
                }
            } else {
                offset += chunk.size;
            }
        }

        return { faces, materials };
    }

    readTexCoords(data, offset) {
        const count = data.getUint16(offset, true);
        offset += 2;

        const uvs = [];

        for (let i = 0; i < count; i++) {
            uvs.push(
                data.getFloat32(offset, true),
                1 - data.getFloat32(offset + 4, true),  // Flip V coordinate
            );
            offset += 8;
        }

        return uvs;
    }

    readMatrix(data, offset) {
        const matrix = [];

        for (let i = 0; i < 12; i++) {
            matrix.push(data.getFloat32(offset + i * 4, true));
        }

        return matrix;
    }

    buildMeshes(group) {
        for (const meshData of this.meshes) {
            const geometry = new BufferGeometry();

            if (meshData.vertices.length > 0) {
                geometry.setAttribute('position', new Float32BufferAttribute(meshData.vertices, 3));
            }

            if (meshData.faces.length > 0) {
                geometry.setIndex(meshData.faces);
            }

            if (meshData.uvs.length > 0) {
                geometry.setAttribute('uv', new Float32BufferAttribute(meshData.uvs, 2));
            }

            geometry.computeVertexNormals();
            geometry.computeBoundingSphere();

            // Create material
            const material = new MeshPhongMaterial({
                color: 0xffffff,
                side: 2,  // DoubleSide
            });

            // Apply material properties if available
            if (meshData.materials.length > 0) {
                const matName = meshData.materials[0];
                const mat = this.materials[matName];
                if (mat) {
                    material.color = mat.diffuse;
                    material.specular = mat.specular;
                    material.shininess = mat.shininess * 100;
                    material.opacity = 1 - mat.transparency;
                    material.transparent = mat.transparency > 0;
                }
            }

            const mesh = new Mesh(geometry, material);
            mesh.name = meshData.name;

            // Apply transformation matrix if available
            if (meshData.matrix) {
                const m = meshData.matrix;
                mesh.matrix.set(
                    m[0], m[1], m[2], 0,
                    m[3], m[4], m[5], 0,
                    m[6], m[7], m[8], 0,
                    m[9], m[10], m[11], 1,
                );
                mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
            }

            group.add(mesh);
        }
    }
}

/**
 * TDSLoader wrapper
 */
class TDSLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url, options) {
        // For blob URLs or absolute URLs, use them directly
        // For relative URLs, prepend server if available
        const path = url.startsWith('blob:') || url.startsWith('http') || url.startsWith('https')
            ? url
            : (this.server || '') + url;

        return new Promise((resolve, reject) => {
            const loader = new TDSLoaderImpl();
            loader.load(
                path,
                (group) => {
                    group.userData.type = '3DS';
                    group.userData.url = url;
                    group.userData.options = options;

                    resolve(group);
                },
                undefined,
                (error) => {
                    console.warn(`TDSLoader: ${url} loading failed.`, error);
                    reject(error);
                },
            );
        });
    }
}

export default TDSLoader;