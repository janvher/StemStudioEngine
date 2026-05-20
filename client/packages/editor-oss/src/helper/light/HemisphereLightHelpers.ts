import {Object3D} from "three";

import {BaseLightHelpers} from "./BaseLightHelpers";
import VolumeHemisphereLightHelper from "./VolumeHemisphereLightHelper";

class HemisphereLightHelpers extends BaseLightHelpers<VolumeHemisphereLightHelper> {
    protected shouldHaveHelper(object: Object3D): boolean {
        return (object as any)?.isHemisphereLight;
    }

    protected createHelper(object: Object3D): VolumeHemisphereLightHelper {
        return new VolumeHemisphereLightHelper(object, 1);
    }
}

export default HemisphereLightHelpers;
