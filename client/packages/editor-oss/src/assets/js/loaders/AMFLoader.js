import * as THREE from "three";

import BaseLoader from "./BaseLoader";

/**
 * AMFLoader
 *
 */
class AMFLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url) {
        return new Promise(resolve => {
            this.require("AMFLoader").then(() => {
                var loader = new THREE.AMFLoader();
                loader.load(
                    url,
                    group => {
                        resolve(group);
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

export default AMFLoader;
