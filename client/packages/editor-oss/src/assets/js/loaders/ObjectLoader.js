import * as THREE from "three";

import BaseLoader from "./BaseLoader";

/**
 * ObjectLoader - JSON File Loader
 * 
 * Loads 3D objects from JSON files and handles special cases like skinned meshes.
 */
class ObjectLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url, options) {
        return new Promise(resolve => {
            this.require(["LegacyJSONLoader"]).then(() => {
                var loader = new THREE.ObjectLoader();

                loader.load(
                    url,
                    obj => {
                        if (obj.traverse) {
                            obj.traverse(n => {
                                // Fix: JSON model files may contain Server: true metadata,
                                // which can cause the same model to be downloaded twice.
                                // Remove this metadata to prevent duplicate downloads.
                                if (n.userData && n.userData.Server === true) {
                                    delete n.userData.Server;
                                    delete n.userData.Url;
                                }
                            });
                        }

                        if (
                            obj instanceof THREE.Scene &&
                            obj.children.length > 0 &&
                            obj.children[0] instanceof THREE.SkinnedMesh
                        ) {
                            resolve(this.loadSkinnedMesh(obj, options));
                        } else {
                            resolve(obj);
                        }
                    },
                    undefined,
                    () => {
                        resolve(null);
                    },
                );
            });
        });
    }

    /**
     * Handle skinned mesh loading, including animation setup
     * @param {THREE.Scene} scene - The scene containing the skinned mesh
     * @param {Object} options - Loading options including Name property
     * @returns {THREE.SkinnedMesh} The processed skinned mesh
     */
    loadSkinnedMesh(scene, options) {
        var mesh = null;

        scene.traverse(child => {
            if (child instanceof THREE.SkinnedMesh) {
                mesh = child;
            }
        });

        var animations = mesh.geometry.animations;

        if (options.Name && animations && animations.length > 0) {
            var names = animations.map(n => n.name);

            var source1 = `var mesh = this.getObjectByName('${options.Name}');\nvar mixer = new THREE.AnimationMixer(mesh);\n\n`;

            var source2 = ``;

            names.forEach(n => {
                source2 += `var ${n}Animation = mixer.clipAction('${n}');\n`;
            });

            var source3 = `\n${names[0]}Animation.play();\n\n`;

            var source4 = `function update(clock, deltaTime) { \n    mixer.update(deltaTime); \n}`;

            var source = source1 + source2 + source3 + source4;

            mesh.userData.scripts = [
                {
                    id: null,
                    name: `${options.Name}Animation`,
                    type: "javascript",
                    source: source,
                    uuid: THREE.MathUtils.generateUUID(),
                },
            ];
        }

        return mesh;
    }
}

export default ObjectLoader;
