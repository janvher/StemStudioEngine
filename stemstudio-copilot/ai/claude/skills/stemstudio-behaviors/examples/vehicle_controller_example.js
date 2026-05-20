/**
 * VEHICLE CONTROLLER MVP PATTERN
 *
 * Uses InputManager instead of direct keyboard listeners. Pair with
 * touchControls: steering wheel or joystick plus brake/boost/reset buttons.
 */

let game;
let target;
let forwardVector;

let speed = 0;
let resetWasDown = false;

this.init = function(_game) {
    game = _game;
    forwardVector = new THREE.Vector3();
};

this.onStart = function() {
    target = this.target;
    if (game && target) {
        game.setPlayer(target);
        game.cameraControl?.start?.(target);
    }
};

this.fixedUpdate = function(deltaTime) {
    if (!game || !target || deltaTime <= 0) return;

    const input = game.inputManager;
    const throttle = input.getMotion("forward");
    const steering = input.getMotion("steer") || input.getMotion("lateral");
    const brake = input.getAction("primary") || input.getAction("crouch");
    const boost = input.getAction("run");
    const resetDown = input.getAction("reload");

    if (resetDown && !resetWasDown) {
        resetVehicle();
    }
    resetWasDown = resetDown;

    const maxSpeed = boost ? (this.attributes.boostSpeed || 28) : (this.attributes.maxSpeed || 18);
    const reverseSpeed = this.attributes.reverseSpeed || 7;
    const acceleration = this.attributes.acceleration || 14;
    const brakeForce = this.attributes.brakeForce || 22;
    const turnRate = this.attributes.turnRate || 2.4;

    speed += throttle * acceleration * deltaTime;
    if (brake) {
        speed -= Math.sign(speed) * Math.min(Math.abs(speed), brakeForce * deltaTime);
    }
    speed *= 0.985;
    speed = clamp(speed, -reverseSpeed, maxSpeed);

    if (Math.abs(speed) > 0.05 && Math.abs(steering) > 0.01) {
        const direction = speed >= 0 ? 1 : -1;
        target.rotateY(-steering * turnRate * direction * deltaTime);
    }

    forwardVector.set(0, 0, -1).applyQuaternion(target.quaternion);
    target.position.addScaledVector(forwardVector, speed * deltaTime);
};

function resetVehicle() {
    speed = 0;
    target.position.set(0, 0.5, 0);
    target.rotation.set(0, 0, 0);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

this.dispose = function() {
    target = null;
    game = null;
};
