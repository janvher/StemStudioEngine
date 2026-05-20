import * as THREE from "three";

import BaseLoader from "./BaseLoader";

/**
 * PRWMLoader
 *
 */
class PRWMLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url) {
        return new Promise(resolve => {
            this.require("PRWMLoader").then(() => {
                var loader = new THREE.PRWMLoader();

                loader.load(
                    url,
                    geometry => {
                        var material = new THREE.MeshPhongMaterial();
                        var mesh = new THREE.Mesh(geometry, material);
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

export default PRWMLoader;
