
import * as THREE from "three";
import {ParticleSystem, QuarksLoader} from "three.quarks";

import {DEFAULT_PARTICLE_CONFIG} from "@web-shared/services";
import {showToast} from "@web-shared/showToast";
import BaseSerializer from "../BaseSerializer";
import GeometriesSerializer from "../geometry/GeometriesSerializer";
import MaterialSerializer from "../material/MaterialSerializer";

/**
 * ParticleEmitterSerializer
 *
 */

const defaultObject = new ParticleSystem(DEFAULT_PARTICLE_CONFIG).emitter;
const defaultJSON = defaultObject.toJSON();
const loader = new QuarksLoader();

// Cache for instancing geometries to avoid recreating the same geometry multiple times
// Structure: Map<key, { object: Geometry, refCount: number }>
const geometryCache = new Map();
// Cache for material maps (textures) to avoid recreating the same texture multiple times
// Structure: Map<key, { object: Texture, refCount: number }>
const mapCache = new Map();

/**
 * Get or create a cached resource with reference counting
 * @param {Map} cache - The cache map to use
 * @param {string} cacheKey - The cache key
 * @param {Function} createFn - Function to create the resource if not cached
 * @returns {object} The cached or newly created resource
 */
function getOrCreateCached(cache, cacheKey, createFn) {
    const cached = cache.get(cacheKey);
    if (cached) {
        cached.refCount++;
        return cached.object;
    }

    const resource = createFn();
    cache.set(cacheKey, {object: resource, refCount: 1});

    const originalDispose = resource.dispose.bind(resource);
    resource.dispose = function () {
        const cached = cache.get(cacheKey);
        if (cached) {
            cached.refCount--;
            if (cached.refCount <= 0) {
                cache.delete(cacheKey);
                originalDispose();
            }
        } else {
            originalDispose();
        }
    };

    return resource;
}

class ParticleEmitterSerializer extends BaseSerializer {
    toJSON(obj) {
        const json = obj.toJSON();
        json.metadata.generator = "ParticleEmitterSerializer";

        json.parentUuid = obj.parent ? obj.parent.uuid : null;
        if (obj.system.rendererSettings.material) {
            json.object.ps.material = new MaterialSerializer().toJSON(obj.system.rendererSettings.material);
        }

        if (obj.system.rendererSettings.instancingGeometry) {
            json.object.ps.instancingGeometry = new GeometriesSerializer().toJSON(
                obj.system.rendererSettings.instancingGeometry,
            );
        }

        json.uuid = obj.uuid;
        json.parent = obj.parent ? obj.parent.uuid : null;

        return json;
    }

    fromJSON(json, parent, options) {
        const jsonCopy = {
            ...json,
            metadata: { ...json.metadata, generator: defaultJSON.metadata.generator },
            object: {
                ...json.object,
                ps: { ...json.object.ps },
            },
        };

        delete jsonCopy.object.ps.material;
        delete jsonCopy._id;
        delete jsonCopy.uuid;
        delete jsonCopy.parent;

        const materialJson = json.object.ps.material;
        const material = new MaterialSerializer().fromJSON(materialJson, undefined, options);

        if (material.map && !material.map.image) {
            showToast({
                type: "error",
                title: "Particle Emitter Error",
                body: "Failed to load particle emitter texture.",
            });

            material.map.dispose();
            const data = new Uint8Array([255, 255, 255, 255]);
            const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
            texture.needsUpdate = true;
            material.map = texture;
        }

        if (materialJson.map && materialJson.map.image && material.map) {
            const mapCacheKey = JSON.stringify(materialJson.map.image);
            const cachedMap = getOrCreateCached(mapCache, mapCacheKey, () => material.map);
            if (cachedMap !== material.map) {
                // Dispose the newly created map for sure but it is not obligatory
                material.map.dispose();
                material.map = cachedMap;
            }
        }

        const obj = loader.parse(jsonCopy);

        // NOTE: obj.system.material = material; causes issues with reference sharing
        obj.system.material.map = material.map;
        obj.system.material.transparent = material.transparent;
        obj.system.material.opacity = material.opacity;
        obj.system.material.blending = material.blending;
        obj.system.material.blendColor = material.blendColor;
        obj.system.material.depthWrite = material.depthWrite;
        obj.system.material.depthTest = material.depthTest;
        obj.system.material.side = material.side;

        if (material.userData) {
            Object.assign(obj.system.material.userData, material.userData);
        }
        obj.system.material.needsUpdate = true;

        if (jsonCopy.object?.ps?.instancingGeometry) {
            const geometry = getOrCreateCached(geometryCache, jsonCopy.object.ps.instancingGeometry, () => {
                const geometry = new GeometriesSerializer().fromJSON(jsonCopy.object.ps.instancingGeometry);
                if (geometry instanceof THREE.PlaneGeometry) {
                    geometry.rotateX(Math.PI / 2);
                }
                return geometry;
            });
            obj.system.instancingGeometry = geometry;
        }

        obj.parentUuid = jsonCopy.parentUuid;

        return obj;
    }
}

export default ParticleEmitterSerializer;
