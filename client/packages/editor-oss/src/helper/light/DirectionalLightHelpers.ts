import { Object3D } from 'three';

import { BaseLightHelpers } from './BaseLightHelpers';
import VolumeDirectionalLightHelper from "./VolumeDirectionalLightHelper";

class DirectionalLightHelpers extends BaseLightHelpers<VolumeDirectionalLightHelper> {
    protected shouldHaveHelper(object: Object3D): boolean {
        return (object as { isDirectionalLight?: boolean }).isDirectionalLight === true;
    }

    protected createHelper(object: Object3D): VolumeDirectionalLightHelper {
        return new VolumeDirectionalLightHelper(object, 1);
    }
}

export default DirectionalLightHelpers;
