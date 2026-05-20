import type { BehaviorInterface, IBehavior} from "./BehaviorTypes.js";
import { OBJECT_TYPES } from "./BehaviorTypes.js";
import { ConsumableBehavior } from "./ConsumableBehavior.js";
import type { IPhysics } from "../physics/common/types.js";
import type CollisionDetector from "../collisions/CollisionDetector.js";
import type { GameRoomState } from "../rooms/schema/GameRoomState.js";

export default class BehaviorManager {
    physics: IPhysics;
    collisionDetector: CollisionDetector;
    behaviors = new Map<string, IBehavior<unknown>>();

    constructor(physics: IPhysics, collisionDetector: CollisionDetector) {
        this.physics = physics;
        this.collisionDetector = collisionDetector;
    }

    parseBehaviours(scene: unknown, children: Array<{ userData?: { behaviors?: BehaviorInterface[] }; uuid: string }>, state: GameRoomState): void {
        children.forEach((child) => {
            if (child?.userData?.behaviors && Array.isArray(child.userData.behaviors)) {
                child.userData.behaviors.forEach((behavior: BehaviorInterface) => {
                    if (behavior.enabled) {
                        this.createBehavior(child.uuid, behavior, state);
                    }
                });
            }
        });
    }

    createBehavior(targetUuid: string, behaviorConfig: BehaviorInterface, state: GameRoomState) {
        const type: OBJECT_TYPES = behaviorConfig.type;
        let behavior: IBehavior<unknown> | null = null;
        switch (type) {
            case OBJECT_TYPES.CONSUMABLE:
                behavior = new ConsumableBehavior();
                this.behaviors.set(targetUuid, behavior);
                break;
            default:
                break;
        }
        behavior?.init(targetUuid, behaviorConfig, state, this.physics, this.collisionDetector);
    }
}
