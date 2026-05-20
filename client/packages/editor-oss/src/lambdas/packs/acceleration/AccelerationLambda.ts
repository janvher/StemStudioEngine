import {LambdaBase} from "../../LambdaBase";

export default class AccelerationLambda extends LambdaBase {
    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (object, data, dt) => {
            // Integrate acceleration into velocity
            data.vx += data.ax * dt;
            data.vy += data.ay * dt;
            data.vz += data.az * dt;

            // Clamp speed
            const speed = Math.sqrt(data.vx * data.vx + data.vy * data.vy + data.vz * data.vz);
            if (speed > data.maxSpeed && speed > 0) {
                const scale = data.maxSpeed / speed;
                data.vx *= scale;
                data.vy *= scale;
                data.vz *= scale;
            }

            // Apply velocity to position
            object.position.x += data.vx * dt;
            object.position.y += data.vy * dt;
            object.position.z += data.vz * dt;

            // Apply damping (adjusted for throttle multiplier)
            if (data.damping > 0) {
                const multiplier = deltaTime > 0 ? dt / deltaTime : 1;
                const factor = multiplier === 1
                    ? 1 - data.damping
                    : Math.pow(1 - data.damping, multiplier);
                data.vx *= factor;
                data.vy *= factor;
                data.vz *= factor;
            }
        });
    }
}
