import * as THREE from "three";

import BaseLoader from "./BaseLoader";

/**
 * BabylonLoader
 *
 */
class BabylonLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url) {
        return new Promise(resolve => {
            this.require("BabylonLoader").then(() => {
                var loader = new THREE.BabylonLoader();

                loader.load(
                    url,
                    scene => {
                        var obj3d = new THREE.Object3D();
                        obj3d.children = scene.children;
                        resolve(obj3d);
                    },
                    undefined,
                    () => {
                        resolve(null);
                    },
                );
            });
        });
    }
}

export default BabylonLoader;
