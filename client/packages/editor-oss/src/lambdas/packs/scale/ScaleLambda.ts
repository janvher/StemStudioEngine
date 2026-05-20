import {LambdaBase} from "../../LambdaBase";

export default class ScaleLambda extends LambdaBase {
    update(_deltaTime: number = 0.016): void {
        // Scale is absolute (not cumulative), so no throttle compensation needed.
        // Still use processObjects for visibility culling and budget enforcement.
        this.processObjects(_deltaTime, (object, data) => {
            if (data.uniform) {
                object.scale.setScalar(data.x);
            } else {
                object.scale.set(data.x, data.y, data.z);
            }
        });
    }
}
