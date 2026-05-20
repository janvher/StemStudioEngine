import {MathUtils} from "three";

import {LambdaBase} from "../../LambdaBase";

const DEG2RAD = MathUtils.DEG2RAD;

export default class RotationLambda extends LambdaBase {
    update(_deltaTime: number = 0.016): void {
        // Rotation is absolute (not cumulative), no throttle compensation needed.
        this.processObjects(_deltaTime, (object, data) => {
            if (data.useQuaternion) {
                object.quaternion.set(data.qx, data.qy, data.qz, data.qw);
            } else {
                // Set rotation directly — no allocation needed
                object.rotation.set(
                    data.x * DEG2RAD,
                    data.y * DEG2RAD,
                    data.z * DEG2RAD,
                    data.order || "XYZ",
                );
            }
        });
    }
}
