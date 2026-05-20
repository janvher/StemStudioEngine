import { Object3D } from "three";

import { LambdaBase } from "../../LambdaBase";

const HIDE_OBJECT_PHYSICS_WAS_ENABLED_KEY = "__hideObjectPhysicsWasEnabled";
const HIDE_OBJECT_PHYSICS_REMOVED_KEY = "__hideObjectPhysicsRemoved";

export default class HideObjectLambda extends LambdaBase {
    private hideTarget(target: Object3D): void {
        target.visible = false;
        this.disablePhysicsIfNeeded(target);
    }

    private disablePhysicsIfNeeded(target: Object3D): void {
        const physicsConfig = target.userData?.physics as { enabled?: boolean } | undefined;
        if (!physicsConfig) {
            return;
        }

        if (target.userData[HIDE_OBJECT_PHYSICS_WAS_ENABLED_KEY] === undefined) {
            target.userData[HIDE_OBJECT_PHYSICS_WAS_ENABLED_KEY] = physicsConfig.enabled === true;
        }

        const wasOriginallyEnabled = target.userData[HIDE_OBJECT_PHYSICS_WAS_ENABLED_KEY] === true;
        if (!wasOriginallyEnabled) {
            return;
        }

        physicsConfig.enabled = false;

        if (target.userData[HIDE_OBJECT_PHYSICS_REMOVED_KEY] !== true) {
            this._game?.engine.physics?.removeObject(target);
            target.userData[HIDE_OBJECT_PHYSICS_REMOVED_KEY] = true;
        }
    }

    private applyVisibility(target: Object3D, includeChildren: boolean): void {
        this.hideTarget(target);
        if (includeChildren) {
            target.traverse(child => {
                this.hideTarget(child);
            });
        }
    }

    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (object, data) => {
            const includeChildren = data.includeChildren !== false;
            this.applyVisibility(object, includeChildren);
        });
    }
}
