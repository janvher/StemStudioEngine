import { GCodeLoader as ThreeGCodeLoader } from "three/examples/jsm/loaders/GCodeLoader.js";

import BaseLoader from "./BaseLoader";

/**
 * GCodeLoader
 *
 */
class GCodeLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url, options) {

        return new Promise(resolve => {
            var loader = new ThreeGCodeLoader();

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
    }
}

export default GCodeLoader;
