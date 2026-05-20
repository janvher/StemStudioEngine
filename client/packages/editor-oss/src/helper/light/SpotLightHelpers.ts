import { Object3D, SpotLight } from 'three';

import { BaseLightHelpers } from './BaseLightHelpers';
import VolumeSpotLightHelper from "./VolumeSpotLightHelper";

class SpotLightHelpers extends BaseLightHelpers<VolumeSpotLightHelper> {
    protected shouldHaveHelper(object: Object3D): boolean {
        return (object as SpotLight)?.isSpotLight;
    }

    protected createHelper(object: Object3D): VolumeSpotLightHelper {
        return new VolumeSpotLightHelper(object, 0xffffff);
    }
}

export default SpotLightHelpers;
