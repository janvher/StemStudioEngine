import * as THREE from "three";

import BaseLoader from "./BaseLoader";

/**
 * AWDLoader
 *
 */
class AWDLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url) {
        return new Promise(resolve => {
            this.require("AWDLoader").then(() => {
                var loader = new THREE.AWDLoader();

                loader.load(
                    url,
                    obj3d => {
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

export default AWDLoader;
