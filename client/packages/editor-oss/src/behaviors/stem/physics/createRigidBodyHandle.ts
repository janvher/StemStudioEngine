import { Object3D, Vector3 } from 'three';

import { PhysicsCollisionBehavior } from './PhysicsSettings';
import { RigidBodyHandle } from './RigidBodyHandle';
import { CollisionBehavior } from '../../../physics/common/types';
import GameManager from '../../game/GameManager';

const COLLISION_BEHAVIOR_TO_INTERNAL: Record<PhysicsCollisionBehavior, CollisionBehavior> = {
    'regular': CollisionBehavior.Regular,
    'ghost': CollisionBehavior.Ghost,
};

// Reuse Vector3 instances shared by the returned methods to avoid per-call allocations
const tmpVector3A = new Vector3();
const tmpVector3B = new Vector3();

/**
 * Create a RigidBodyHandle for runtime physics manipulation.
 * @param object - The object to create the handle for
 * @param game - The game manager
 * @returns A RigidBodyHandle
 */
export const createRigidBodyHandle = (object: Object3D, game: GameManager): RigidBodyHandle => {
    const physics = game.physics;
    const uuid = object.uuid;
    return {
        uuid,

        applyImpulse(impulse, relativePosition) {
            if (relativePosition === undefined) {
                tmpVector3A.set(impulse.x, impulse.y, impulse.z);
                physics?.applyCentralImpulse(uuid, tmpVector3A);
            } else {
                tmpVector3A.set(impulse.x, impulse.y, impulse.z);
                tmpVector3B.set(relativePosition.x, relativePosition.y, relativePosition.z);
                physics?.applyImpulseToRigidBody(uuid, tmpVector3A, tmpVector3B);
            }
        },

        setVelocity(velocity) {
            tmpVector3A.set(velocity.x, velocity.y, velocity.z);
            physics?.setLinearVelocity(uuid, tmpVector3A);
        },

        setCollisionBehavior(behavior) {
            physics?.setCollisionBehavior(uuid, COLLISION_BEHAVIOR_TO_INTERNAL[behavior]);
        },

        remove() {
            physics?.remove(uuid);
        },
    };
};
