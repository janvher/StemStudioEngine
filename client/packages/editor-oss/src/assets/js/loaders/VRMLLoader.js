import { VRMLLoader as ThreeVRMLLoader } from "three/examples/jsm/loaders/VRMLLoader.js";

import BaseLoader from "./BaseLoader";

/**
 * VRMLLoader
 *
 */
class VRMLLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url, options) {

        return new Promise(resolve => {
            var loader = new ThreeVRMLLoader();
            loader.load(
                url,
                obj => {
                    resolve(obj);
                },
                undefined,
                () => {
                    resolve(null);
                },
            );
        });
    }
}

export default VRMLLoader;
