import { Object3D, Quaternion, Vector3 } from 'three';

import MathUtils from "../../../physics/common/math";
import { IPhysics } from "../../../physics/common/types";
import { PhysicsUtil } from "../../../physics/PhysicsUtil";
import { isDirectionalLight } from '@stem/editor-oss/utils/LightUtils';
import { BehaviorBase } from "../../Behavior";
import GameManager from "../../game/GameManager";
import { BehaviorThrottlePriority } from "../../performance/interfaces/IThrottleStrategy";

class FollowBehavior extends BehaviorBase {
    protected game: GameManager | null = null;

    private static tmpVectorA = new Vector3();
    private static tmpVectorB = new Vector3();
    private static tmpQuaternionA = new Quaternion();

    private followTarget: Object3D | null = null;
    private physics?: IPhysics;
    private isActive: boolean = false;
    private initialOffset?: Vector3;

    init(game: GameManager) {
        this.game = game;

        this.followTarget = game.scene?.getObjectByProperty("uuid", this.attributes.followTargetUuid) ?? null;
        this.physics = game.collisionDetector?.physics;
        if (!this.attributes.startOnTrigger) {
            this.isActive = true;
        }
    }

    update(deltaTime: number) {
        if (isDirectionalLight(this.target)) {
            return;
        }

        if (!this.isActive || !this.followTarget || !this.target || this.attributes.speed <= 0) {
            return;
        }

        const followPosition = this.followTarget.position.clone();
        const parentPosition = this.target.position.clone();

        if (isDirectionalLight(this.target)) {
            if (!this.initialOffset) {
                this.initialOffset = this.target.position.clone().sub(this.followTarget.position.clone());
            }

            this.target.target.position.copy(followPosition);
            if (this.target.target.updateMatrixWorld) {
                this.target.target.updateMatrixWorld();
            }
            this.target.position.copy(followPosition.clone().add(this.initialOffset));
            return;
        }

        const currentDistance = parentPosition.distanceTo(followPosition);

        const newPosition = parentPosition.clone();
        const newQuaternion = this.target.quaternion.clone();

        const alpha = MathUtils.clamp(this.attributes.speed * deltaTime, 0, 1);

        if (this.attributes.distance < currentDistance) {
            newPosition.lerp(followPosition, alpha);
        }

        if (this.attributes.rotate) {
            this.target.lookAt(followPosition);
            newQuaternion.slerp(this.target.quaternion, alpha);
        }

        this.target.quaternion.copy(newQuaternion);
        this.target.position.copy(newPosition);

        this.updatePhysicsObject();
    }

    private updatePhysicsObject() {
        if (!this.physics || !this.target || !PhysicsUtil.isPhysicsEnabled(this.target)) {
            return;
        }

        PhysicsUtil.calculatePhysicsPositionFromObject(
            this.target,
            FollowBehavior.tmpVectorA,
            FollowBehavior.tmpQuaternionA,
            FollowBehavior.tmpVectorB,
        );
        this.physics.setOrigin(this.target.uuid, FollowBehavior.tmpVectorA);
        this.physics.setRotation(this.target.uuid, FollowBehavior.tmpQuaternionA);
    }

    onStart(): void {

    }

    onStop(): void {

    }

    onReset() {

    }

    onAttributesUpdated(): void {
        this.followTarget = this.game?.scene?.getObjectByProperty("uuid", this.attributes.followTargetUuid) ?? null;
    }

    onEvent(msg: string, data: unknown): void {
        if (msg === "trigger" && typeof data === "object" && data !== null && "actionType" in data) {
            this.isActive = (data as { actionType?: string }).actionType === "activate";
        }
    }
}

export default FollowBehavior;
