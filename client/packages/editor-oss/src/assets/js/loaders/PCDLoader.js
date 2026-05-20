import { PCDLoader as ThreePCDLoader } from "three/examples/jsm/loaders/PCDLoader.js";

import BaseLoader from "./BaseLoader";

/**
 * PCDLoader
 *
 */
class PCDLoader extends BaseLoader {
    constructor() {
        super();
    }

    load(url, options) {

        return new Promise(resolve => {
            var loader = new ThreePCDLoader();
            loader.load(
                url,
                mesh => {
                    resolve(mesh);
                },
                undefined,
                () => {
                    resolve(null);
                },
            );
        });
    }
}

export default PCDLoader;
