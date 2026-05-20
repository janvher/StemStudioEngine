import * as THREE from "three";

import BaseLoader from "./BaseLoader";

/**
 * BinaryLoader
 *
 */
class BinaryLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url) {
        return new Promise(resolve => {
            this.require("BinaryLoader").then(() => {
                var loader = new THREE.BinaryLoader();

                loader.load(
                    url,
                    (geometry, materials) => {
                        var mesh = new THREE.Mesh(geometry, materials);
                        resolve(mesh);
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

export default BinaryLoader;
