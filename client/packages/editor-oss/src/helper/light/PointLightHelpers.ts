import { Object3D } from 'three';

import { BaseLightHelpers } from './BaseLightHelpers';
import VolumePointLightHelper from "./VolumePointLightHelper";

class PointLightHelpers extends BaseLightHelpers<VolumePointLightHelper> {
    protected shouldHaveHelper(object: Object3D): boolean {
        return (object as any)?.isPointLight;
    }

    protected createHelper(object: Object3D): VolumePointLightHelper {
        return new VolumePointLightHelper(object, 1);
    }
}

export default PointLightHelpers;
