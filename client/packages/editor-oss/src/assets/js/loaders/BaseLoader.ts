import PackageManager from "../../../package/PackageManager";
import { patchTextureLoaders } from "../../../utils/TextureUtils";

patchTextureLoaders();

let ID = -1;

/**
 * BaseLoader
 *
 */
class BaseLoader {
    id: string;
    packageManager: PackageManager;
    require: OmitThisParameter<((names: object) => Promise<any>) | any>;

    constructor() {
        this.id = `BaseLoader${ID--}`;
        this.packageManager = new PackageManager();
        this.require = this.packageManager.require.bind(this.packageManager);
    }

    load(url: string, options?: any) {
         
        return new Promise(resolve => {
            resolve(null);
        });
    }

    dispose() {
    }
}

export default BaseLoader;
