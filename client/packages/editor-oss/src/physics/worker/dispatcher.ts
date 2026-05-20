import {QuaternionLike, Vector3Like} from "three";

import {PHYSICS_EVENTS} from "../common/events";
import {IDispatcher, ObjectMotionState} from "../common/types";

export class Dispatcher implements IDispatcher {
    onReady() {
        postMessage({event: PHYSICS_EVENTS.READY});
    }

    onBodyUpdate(uuid: string, position: Vector3Like, rotation: QuaternionLike, scale: Vector3Like, dt: number, motionState: ObjectMotionState) {
        postMessage({
            event: PHYSICS_EVENTS.BODY.UPDATE,
            uuid,
            position: {x: position.x, y: position.y, z: position.z},
            quaternion: {x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w},
            scale: {x: scale.x, y: scale.y, z: scale.z},
            motionState,
            dt
        });
    }

    onCollision(uuid: string, listenerId: string) {
        postMessage({
            event: PHYSICS_EVENTS.COLLISION.DETECTED,
            uuid,
            listenerId
        });
    }
}

export default Dispatcher;
