import {MTLLoader as MTLLoaderImpl} from "three/examples/jsm/loaders/MTLLoader.js";

import BaseLoader from "./BaseLoader";
import {OBJLoader2 as OBJLoaderImpl} from "./OBJLoader2";

/**
 * OBJLoader
 *
 */
class OBJLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url) {
        return new Promise(resolve => {
            var objLoader = new OBJLoaderImpl();
            var mtlLoader = new MTLLoaderImpl();

            //in DB: url[0] - obj, url[1] - mtl
            var promise = new Promise(resolve1 => {
                mtlLoader.load(
                    url[1],
                    obj => {
                        resolve1(obj);
                    },
                    undefined,
                    () => {
                        resolve1(null);
                    },
                );
            });

            promise.then(mtl => {
                if (mtl) {
                    mtl.preload();
                    objLoader.setMaterials(mtl.materials);
                }

                objLoader.load(
                    url[0],
                    obj => {
                        resolve(obj.detail.loaderRootNode);
                    },
                    undefined,
                    e => {
                        console.error("ERROR: Failed to load .obj model: " + e);
                        resolve(null);
                    },
                );
            });
        });
    }
}

export default OBJLoader;
