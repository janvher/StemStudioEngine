import * as THREE from "three";

import BaseSerializer from "../BaseSerializer";
import TexturesSerializer from "../texture/TexturesSerializer";

/**
 * MaterialSerializer
 *
 */

const properties = [
    "alphaTest",
    "aoMapIntensity",
    "blendDst",
    "blendDstAlpha",
    "blendEquation",
    "blendEquationAlpha",
    "blendSrc",
    "blendSrcAlpha",
    "blending",
    "bumpScale",
    "clipIntersection",
    "clipShadow",
    "clippingPlanes",
    "combine",
    "color",
    "colorWrite",
    "depthFunc",
    "depthTest",
    "depthWrite",
    "displacementBias",
    "displacementScale",
    "dithering",
    "emissive",
    "emissiveIntensity",
    "envMapIntensity",
    "envMapRotation",
    "isMeshBasicMaterial",
    "isMeshDepthMaterial",
    "isMeshDistanceMaterial",
    "isMeshLambertMaterial",
    "isMeshMatcapMaterial",
    "isMeshNormalMaterial",
    "isMeshPhongMaterial",
    "isMeshPhysicalMaterial",
    "isMeshStandardMaterial",
    "isPointsMaterial",
    "isShadowMaterial",
    "isSpriteMaterial",
    "flatShading",
    "fog",
    "lightMapIntensity",
    "lights",
    "linewidth",
    "metalness",
    "morphNormals",
    "morphTargets",
    "name",
    "normalScale",
    "opacity",
    "polygonOffset",
    "polygonOffsetFactor",
    "polygonOffsetUnits",
    "precision",
    "premultipliedAlpha",
    "refractionRatio",
    "reflectivity",
    "roughness",
    "shadowSide",
    "side",
    "skinning",
    "transparent",
    "type",
    "userData",
    "uuid",
    "vertexColors",
    "visible",
    "wireframe",
    "wireframeLinecap",
    "wireframeLinejoin",
    "wireframeLinewidth",
];

const textures = [
    "alphaMap",
    "aoMap",
    "bumpMap",
    "displacementMap",
    "emissiveMap",
    "envMap",
    "lightMap",
    "map",
    "metalnessMap",
    "normalMap",
    "roughnessMap",
    "specularMap",
];

class MaterialSerializer extends BaseSerializer {
    toJSON(obj, defaultMaterial) {
        const material = defaultMaterial ? defaultMaterial : new THREE.Material();
        const json = BaseSerializer.prototype.toJSON.call(this, obj);
        const allProps = [...properties, ...textures];

        allProps.forEach(key => {
            if (obj[key] instanceof THREE.Color) {
                json[key] = obj[key].getHex();
            } else if (obj[key] instanceof THREE.Texture) {
                json[key] = new TexturesSerializer().toJSON(obj[key]);
            } else if (obj[key] instanceof THREE.Euler) {
                json[key] = {x: obj[key].x, y: obj[key].y, z: obj[key].z, order: obj[key].order};
            } else if (obj[key] === undefined) {
                return; // Skip undefined properties
            } else if (JSON.stringify(obj[key]) !== JSON.stringify(material[key])) {
                json[key] = obj[key];
            }
        });

        return json;
    }

    fromJSON(json, parent, options) {
        var obj = parent === undefined ? new THREE.Material() : parent;

        // Track pending async texture loads so we can batch needsUpdate into a
        // single shader recompilation instead of one per texture (up to 12x fewer).
        let pendingTextureLoads = 0;

        Object.keys(json).forEach(key => {
            if (key === "metadata") return;

            // TODO: consider using default fromJSON
            if (key === "color" || key === "emissive" || key === "specular") {
                obj[key] = new THREE.Color(json[key]);
            } else if (key === "envMapRotation") {
                obj[key] = new THREE.Euler(json[key].x, json[key].y, json[key].z, json[key].order);
            } else if (key === "normalScale") {
                obj[key] = new THREE.Vector2(json[key].x, json[key].y);
            } else if (key === "clippingPlanes" && json[key]) {
                obj[key] = json[key].map(plane => new THREE.Plane(new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z), plane.constant));
            } else if (textures.includes(key) && json[key]) {
                // NOTE: there is a bug in WebGPU backend of three.js that causes failure when
                // we try to update a texture that changes its size. So we create a clone of the texture
                // and reassign it to the material to avoid the issue.
                pendingTextureLoads++;
                const textureKey = key;
                /**
                 *
                 * @param texture
                 */
                function onload(texture) {
                    obj[textureKey] = texture;
                    if (["map", "emissiveMap", "specularMap"].includes(textureKey)) {
                        obj[textureKey].colorSpace = THREE.SRGBColorSpace;
                    }
                    // Batch: only trigger shader recompilation when the last
                    // texture for this material finishes loading.
                    pendingTextureLoads--;
                    if (pendingTextureLoads <= 0) {
                        obj.needsUpdate = true;
                    }
                }
                obj[key] = new TexturesSerializer().fromJSON(json[key], undefined, { ...options, onload });

                if (["map", "emissiveMap", "specularMap"].includes(key)) {
                    obj[key].colorSpace = THREE.SRGBColorSpace;
                }
            } else {
                obj[key] = json[key];
            }
        });

        return obj;
    }
}

export default MaterialSerializer;
