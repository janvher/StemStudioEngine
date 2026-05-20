import * as THREE from "three";

import BaseLoader from "./BaseLoader";

/**
 * NRRDLoader
 *
 */
class NRRDLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url) {

        return new Promise(resolve => {
            this.require("NRRDLoader").then(() => {
                var loader = new THREE.NRRDLoader();
                loader.load(
                    url,
                    () => {
                         
                        var loader = new THREE.NRRDLoader();
                        loader.load(url, volume => {
                            var obj = new THREE.Object3D();

                            // x plane
                            var sliceX = volume.extractSlice("x", Math.floor(volume.RASDimensions[0] / 2));
                            obj.add(sliceX.mesh);

                            //y plane
                            var sliceY = volume.extractSlice("y", Math.floor(volume.RASDimensions[1] / 2));
                            obj.add(sliceY.mesh);

                            //z plane
                            var sliceZ = volume.extractSlice("z", Math.floor(volume.RASDimensions[2] / 4));
                            obj.add(sliceZ.mesh);

                            resolve(obj);
                        });
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

export default NRRDLoader;
