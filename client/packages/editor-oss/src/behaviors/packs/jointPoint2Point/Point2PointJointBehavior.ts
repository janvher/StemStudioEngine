import {Vector3} from "three";

import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

class Point2PointJointBehavior extends BehaviorBase {

    game: GameManager | null = null;

    init(game: GameManager) {
        this.game = game;
    }

    onStart(): void {
        const objectA = this.target;
        const objectB = this.game?.scene?.getObjectByProperty("uuid", this.attributes.objectB);

        if (!objectB) {
            console.warn("Point2PointJointBehavior: object B is not found in the scene: "+this.attributes.objectB);
            return;
        }

        const pivotA = new Vector3(this.attributes.pivotA.x, this.attributes.pivotA.y, this.attributes.pivotA.z);
        const pivotB = new Vector3(this.attributes.pivotB.x, this.attributes.pivotB.y, this.attributes.pivotB.z);

        this.game?.physics?.addPoint2PointJoint(
            this.attributes.collisionEnabled as boolean,
            objectA.uuid,
            pivotA,
            objectB.uuid,
            pivotB,
        );
    }

    onStop(): void {
        //TODO: we don't support removing individual constraints
        //  and physics engine will destroy all constraints when stopped
    }
}

export default Point2PointJointBehavior;
