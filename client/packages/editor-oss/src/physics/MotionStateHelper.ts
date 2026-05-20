import {Object3D} from "three";

import {ObjectMotionState} from "./common/types";


export default class MotionStateHelper {

    public static getMotionState(object: Object3D): ObjectMotionState | undefined {
        return object.userData.motionState;
    }

}