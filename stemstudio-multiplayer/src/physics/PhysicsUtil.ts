import type { CommonData, Object3D } from "./common/types.js";
import { COLLISION_MAP, CollisionFlag } from "./common/types.js";

export class PhysicsUtil {

    static getCommonDataForObject(object: Object3D): CommonData {
        return this.getCommonData(object, object.userData.physics);
    }

    static getCommonData(object: Object3D, physicsConfig: any): CommonData {
        return {
            uuid: object.uuid,
            template: "",
            name: object.name,
            position: { x: object.position.x, y: object.position.y, z: object.position.z },
            quaternion: {
                x: object.quaternion.x,
                y: object.quaternion.y,
                z: object.quaternion.z,
                w: object.quaternion.w
            },
            scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
            mass: physicsConfig.mass,
            collision_flag: physicsConfig.ctype ? COLLISION_MAP.get(physicsConfig.ctype) : CollisionFlag.DYNAMIC,
            friction: physicsConfig.friction,
            restitution: physicsConfig.restitution,
            damping: physicsConfig.damping
        } as CommonData;
    }
}
