import type { ConsumableBehaviorInterface, IBehavior } from "./BehaviorTypes.js";
import type { IPhysics } from "../physics/common/types.js";
import { COLLISION_TYPE } from "../physics/common/types.js";
import type CollisionDetector from "../collisions/CollisionDetector.js";
import type { GameRoomState } from "../rooms/schema/GameRoomState.js";

export class ConsumableBehavior implements IBehavior<ConsumableBehaviorInterface> {
    target: string; //UUID
    config: ConsumableBehaviorInterface;
    state: GameRoomState;
    physics: IPhysics;
    collisionDetector: CollisionDetector;

    init(target: string, config: ConsumableBehaviorInterface, state: GameRoomState, physics: IPhysics, collisionDetector: CollisionDetector): void {
        this.target = target;
        this.config = config;
        this.state = state;
        this.physics = physics;
        this.collisionDetector = collisionDetector;
        this.addCollisionListener();
        console.log(`[ConsumableBehavior]: init ${this.target}`, config);
    }

    onCollision() : void {
        console.log(`[ConsumableBehavior]: onCollision ${this.target}`);
        this.physics.remove(this.target);
        this.state.objects.delete(this.target);
        this.state.gameState.score += this.config.pointAmount;
    }

    addCollisionListener() {
        const collisionType = this.getCollisionType();
        if (collisionType !== COLLISION_TYPE.UNKNOWN) {
            this.collisionDetector.addListener(
                this.target,
                {
                    type: collisionType,
                    callback: this.onCollision.bind(this)
                }
            );
        } else {
            console.warn("Collision type is not specified for " + this.target);
        }
    }

    getCollisionType(): COLLISION_TYPE {
        if (this.config.collisionSettings === null) return COLLISION_TYPE.UNKNOWN;
        return this.config.collisionSettings.playerCollision
            ? COLLISION_TYPE.WITH_PLAYER
            : this.config.collisionSettings.throwableCollision
                ? COLLISION_TYPE.WITH_COLLIDABLE_OBJECTS
                : this.config.collisionSettings.enemyCollision
                    ? COLLISION_TYPE.WITH_ENEMY
                    : COLLISION_TYPE.UNKNOWN;
    }
}
