import { Object3D } from 'three';

import { BaseLightHelpers } from './BaseLightHelpers';
import RectAreaLightHelper from "./RectAreaLightHelper";

class RectAreaLightHelpers extends BaseLightHelpers<RectAreaLightHelper> {
    protected shouldHaveHelper(object: Object3D): boolean {
        return (object as {isRectAreaLight?: boolean}).isRectAreaLight === true;
    }

    protected createHelper(object: Object3D): RectAreaLightHelper {
        return new RectAreaLightHelper(object);
    }
}

export default RectAreaLightHelpers;
