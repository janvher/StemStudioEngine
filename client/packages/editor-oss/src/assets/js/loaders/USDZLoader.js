
import {
    BufferGeometry,
    FileLoader,
    Float32BufferAttribute,
    Group,
    Loader,
    Mesh,
    MeshStandardMaterial,
    Matrix4,
} from 'three';

import BaseLoader from './BaseLoader';

class USDZLoaderImpl extends Loader {
    constructor(manager) {
        super(manager);
    }

    load(url, onLoad, onProgress, onError) {
        const scope = this;
        const loader = new FileLoader(this.manager);
        loader.setPath(this.path);
        loader.setResponseType('arraybuffer');
        loader.setRequestHeader(this.requestHeader);
        loader.setWithCredentials(this.withCredentials);

        loader.load(url, function (data) {
            try {
                onLoad(scope.parse(data));
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

        // USDZ is a zip archive containing USD files and assets
        const zip = this.parseZip(buffer);

        if (!zip) {
            console.warn('USDZLoader: Failed to parse zip archive');
            return group;
        }

        // Find the main USD file (usually named .usdc or .usda)
        let mainFile = null;
        let mainFileName = null;

        for (const filename in zip.files) {
            if (filename.endsWith('.usdc') || filename.endsWith('.usda') || filename.endsWith('.usd')) {
                mainFile = zip.files[filename];
                mainFileName = filename;
                break;
            }
        }

        if (!mainFile) {
            console.warn('USDZLoader: No USD file found in archive');
            return group;
        }

        // Parse the main USD file
        const usdContent = mainFile.content;
        const scene = this.parseUSD(usdContent, zip, mainFileName);

        return scene;
    }

    parseZip(buffer) {
        const zip = { files: {} };

        // Simple ZIP parser for USDZ files
        const view = new DataView(buffer);
        let offset = 0;

        // Find central directory
        const centralDirOffset = this.findCentralDirectory(view);
        if (centralDirOffset === -1) return null;

        offset = centralDirOffset;

        // Parse central directory entries
        while (offset < view.byteLength - 4) {
            const signature = view.getUint32(offset, true);

            if (signature !== 0x02014b50) break; // End of central directory

            const fileNameLength = view.getUint16(offset + 28, true);
            const extraFieldLength = view.getUint16(offset + 30, true);
            const fileCommentLength = view.getUint16(offset + 32, true);
            const localHeaderOffset = view.getUint32(offset + 42, true);

            const fileName = this.getString(view, offset + 46, fileNameLength);

            // Read file data from local header
            const fileData = this.readFileData(view, localHeaderOffset);
            if (fileData) {
                zip.files[fileName] = {
                    name: fileName,
                    content: fileData,
                };
            }

            offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
        }

        return zip;
    }

    findCentralDirectory(view) {
        // Search for End of Central Directory signature
        for (let i = view.byteLength - 22; i >= 0; i--) {
            if (view.getUint32(i, true) === 0x06054b50) {
                return view.getUint32(i + 16, true);
            }
        }
        return -1;
    }

    readFileData(view, offset) {
        if (view.getUint32(offset, true) !== 0x04034b50) return null;

        const compressionMethod = view.getUint16(offset + 8, true);
        const uncompressedSize = view.getUint32(offset + 22, true);
        const fileNameLength = view.getUint16(offset + 26, true);
        const extraFieldLength = view.getUint16(offset + 28, true);

        const dataOffset = offset + 30 + fileNameLength + extraFieldLength;

        if (compressionMethod === 0) {
            // Uncompressed
            return new Uint8Array(view.buffer, view.byteOffset + dataOffset, uncompressedSize);
        } else if (compressionMethod === 8) {
            // Deflate compression - would need pako or similar library
            console.warn('USDZLoader: Deflate compression not implemented');
            return null;
        }

        return null;
    }

    getString(view, offset, length) {
        const bytes = new Uint8Array(view.buffer, view.byteOffset + offset, length);
        return new TextDecoder().decode(bytes);
    }

    parseUSD(content, zip, filename) {
        const group = new Group();

        // Basic USD parser - this is a simplified version
        // Real USD parsing is complex and would require a full USD library

        if (filename.endsWith('.usda')) {
            // ASCII USD format
            const text = new TextDecoder().decode(content);
            return this.parseUSDA(text);
        } else if (filename.endsWith('.usdc')) {
            // Binary USD format (Crate)
            return this.parseUSDC();
        }

        return group;
    }

    parseUSDA(text) {
        const group = new Group();
        const lines = text.split('\n');

        let currentMesh = null;
        let vertices = [];
        let normals = [];
        let uvs = [];
        let indices = [];
        let transform = new Matrix4();

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Parse mesh definition
            if (line.includes('def Mesh')) {
                if (currentMesh) {
                    this.createMeshFromData(group, vertices, normals, uvs, indices, transform);
                }
                currentMesh = line;
                vertices = [];
                normals = [];
                uvs = [];
                indices = [];
                transform = new Matrix4();
            }

            // Parse vertices
            if (line.includes('point3f[] points')) {
                const pointsMatch = text.match(/point3f\[\] points = \[([\s\S]*?)\]/);
                if (pointsMatch) {
                    const pointsStr = pointsMatch[1];
                    const pointsArray = pointsStr.match(/\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/g);
                    if (pointsArray) {
                        pointsArray.forEach(point => {
                            const coords = point.match(/([-\d.]+)/g);
                            if (coords) {
                                vertices.push(
                                    parseFloat(coords[0]),
                                    parseFloat(coords[1]),
                                    parseFloat(coords[2]),
                                );
                            }
                        });
                    }
                }
            }

            // Parse normals
            if (line.includes('normal3f[] normals')) {
                const normalsMatch = text.match(/normal3f\[\] normals = \[([\s\S]*?)\]/);
                if (normalsMatch) {
                    const normalsStr = normalsMatch[1];
                    const normalsArray = normalsStr.match(/\(([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)\)/g);
                    if (normalsArray) {
                        normalsArray.forEach(normal => {
                            const coords = normal.match(/([-\d.]+)/g);
                            if (coords) {
                                normals.push(
                                    parseFloat(coords[0]),
                                    parseFloat(coords[1]),
                                    parseFloat(coords[2]),
                                );
                            }
                        });
                    }
                }
            }

            // Parse UVs
            if (line.includes('texCoord2f[] primvars:st')) {
                const uvsMatch = text.match(/texCoord2f\[\] primvars:st = \[([\s\S]*?)\]/);
                if (uvsMatch) {
                    const uvsStr = uvsMatch[1];
                    const uvsArray = uvsStr.match(/\(([-\d.]+),\s*([-\d.]+)\)/g);
                    if (uvsArray) {
                        uvsArray.forEach(uv => {
                            const coords = uv.match(/([-\d.]+)/g);
                            if (coords) {
                                uvs.push(
                                    parseFloat(coords[0]),
                                    parseFloat(coords[1]),
                                );
                            }
                        });
                    }
                }
            }

            // Parse face indices
            if (line.includes('int[] faceVertexIndices')) {
                const indicesMatch = text.match(/int\[\] faceVertexIndices = \[([\s\S]*?)\]/);
                if (indicesMatch) {
                    const indicesStr = indicesMatch[1];
                    const indicesArray = indicesStr.match(/\d+/g);
                    if (indicesArray) {
                        indices = indicesArray.map(idx => parseInt(idx));
                    }
                }
            }

            // Parse transform
            if (line.includes('matrix4d xformOp:transform')) {
                const transformMatch = text.match(/matrix4d xformOp:transform = \(([\s\S]*?)\)/);
                if (transformMatch) {
                    const matrixStr = transformMatch[1];
                    const values = matrixStr.match(/([-\d.]+)/g);
                    if (values && values.length === 16) {
                        const m = values.map(v => parseFloat(v));
                        transform.set(
                            m[0], m[4], m[8], m[12],
                            m[1], m[5], m[9], m[13],
                            m[2], m[6], m[10], m[14],
                            m[3], m[7], m[11], m[15],
                        );
                    }
                }
            }
        }

        // Create final mesh if any
        if (currentMesh) {
            this.createMeshFromData(group, vertices, normals, uvs, indices, transform);
        }

        return group;
    }

    parseUSDC() {
        const group = new Group();

        // Binary USD (Crate) format is complex
        // This is a placeholder for basic structure
        console.warn('USDZLoader: Binary USD (USDC) parsing not fully implemented');

        // Create a simple placeholder mesh
        const geometry = new BufferGeometry();
        const vertices = new Float32Array([
            -1, -1, 0,
             1, -1, 0,
             1,  1, 0,
            -1,  1, 0,
        ]);
        const indices = [0, 1, 2, 0, 2, 3];

        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new MeshStandardMaterial({ color: 0x808080 });
        const mesh = new Mesh(geometry, material);
        group.add(mesh);

        return group;
    }

    createMeshFromData(parent, vertices, normals, uvs, indices, transform) {
        if (vertices.length === 0) return;

        const geometry = new BufferGeometry();

        geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));

        if (normals.length > 0) {
            geometry.setAttribute('normal', new Float32BufferAttribute(normals, 3));
        }

        if (uvs.length > 0) {
            geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
        }

        if (indices.length > 0) {
            geometry.setIndex(indices);
        }

        if (!geometry.hasAttribute('normal')) {
            geometry.computeVertexNormals();
        }

        geometry.computeBoundingSphere();

        const material = new MeshStandardMaterial({
            color: 0xffffff,
            metalness: 0.5,
            roughness: 0.5,
        });

        const mesh = new Mesh(geometry, material);
        mesh.applyMatrix4(transform);

        parent.add(mesh);
    }
}

/**
 * USDZLoader wrapper
 */
class USDZLoader extends BaseLoader {
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
            const loader = new USDZLoaderImpl();
            loader.load(
                path,
                (group) => {
                    group.userData.type = 'USDZ';
                    group.userData.url = url;
                    group.userData.options = options;

                    resolve(group);
                },
                undefined,
                (error) => {
                    console.warn(`USDZLoader: ${url} loading failed.`, error);
                    reject(error);
                },
            );
        });
    }
}

export default USDZLoader;