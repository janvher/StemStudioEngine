import {LambdaBase} from "../../LambdaBase";

export default class PositionLambda extends LambdaBase {
    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (object, data, dt) => {
            if (data.mode === "offset") {
                // Scale offset by dt so movement is frame-rate independent
                object.position.x += data.x * dt;
                object.position.y += data.y * dt;
                object.position.z += data.z * dt;
            } else {
                object.position.set(data.x, data.y, data.z);
            }
        });
    }
}
