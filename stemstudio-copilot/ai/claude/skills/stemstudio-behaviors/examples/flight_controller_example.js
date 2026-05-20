/**
 * FLIGHT CONTROLLER MVP PATTERN
 *
 * Engine-current pattern: closure capture, InputManager, -Z forward, and a
 * landable on-ground state. Pair this with touchControls on the scene host.
 */

let game;
let target;
let velocity;
let forwardVector;
let upVector;
let rightVector;

let throttle = 0.35;
let onGround = true;
let crashed = false;
let jumpWasDown = false;
let resetWasDown = false;

this.init = function(_game) {
    game = _game;
    velocity = new THREE.Vector3();
    forwardVector = new THREE.Vector3();
    upVector = new THREE.Vector3();
    rightVector = new THREE.Vector3();
};

this.onStart = function() {
    target = this.target;
    if (game && target) {
        game.setPlayer(target);
    }
};

this.fixedUpdate = function(deltaTime) {
    if (!game || !target || deltaTime <= 0) return;

    const input = game.inputManager;
    const resetDown = input.getAction("reload");
    if (resetDown && !resetWasDown) {
        resetPlane();
    }
    resetWasDown = resetDown;
    if (crashed) return;

    const pitch = input.getMotion("forward");
    const roll = input.getMotion("lateral");
    const yaw = (input.getAction("use") ? 1 : 0) - (input.getAction("drop") ? 1 : 0);
    const throttleUp = input.getAction("run") ? 1 : 0;
    const brake = input.getAction("primary") || input.getAction("crouch");
    const jumpDown = input.getAction("jump");

    throttle += (throttleUp ? 0.45 : -0.08) * deltaTime;
    if (brake) throttle -= 0.65 * deltaTime;
    throttle = clamp(throttle, 0, 1);

    const pitchRate = onGround ? 0.45 : 1.2;
    const rollRate = onGround ? 0.35 : 1.8;
    const yawRate = onGround ? 1.1 : 0.65;

    target.rotateX(-pitch * pitchRate * deltaTime);
    target.rotateZ(-roll * rollRate * deltaTime);
    target.rotateY(yaw * yawRate * deltaTime);

    forwardVector.set(0, 0, -1).applyQuaternion(target.quaternion);
    upVector.set(0, 1, 0).applyQuaternion(target.quaternion);
    rightVector.set(1, 0, 0).applyQuaternion(target.quaternion);

    const speed = THREE.MathUtils.lerp(this.attributes.stallSpeed || 8, this.attributes.maxSpeed || 38, throttle);
    velocity.copy(forwardVector).multiplyScalar(speed);

    const lift = Math.max(0, speed - (this.attributes.stallSpeed || 8)) * (this.attributes.lift || 0.18);
    velocity.addScaledVector(upVector, lift);
    velocity.y -= (this.attributes.gravity || 9.8);

    if (onGround) {
        velocity.y = Math.max(0, velocity.y);
        if (jumpDown && !jumpWasDown && speed >= (this.attributes.takeoffSpeed || 14)) {
            onGround = false;
            target.position.y = (this.attributes.gearHeight || 1.2) + 0.15;
        }
    }
    jumpWasDown = jumpDown;

    target.position.addScaledVector(velocity, deltaTime);
    resolveLanding(deltaTime, brake);
};

function resolveLanding(deltaTime, brake) {
    const groundY = 0;
    const gearHeight = 1.2;
    if (target.position.y > groundY + gearHeight) {
        onGround = false;
        return;
    }

    const verticalSpeed = velocity.y;
    const roll = Math.abs(target.rotation.z);
    const pitch = Math.abs(target.rotation.x);
    const tooHard = verticalSpeed < -8 || roll > 0.8 || pitch > 0.65;

    target.position.y = groundY + gearHeight;
    if (tooHard) {
        crashed = true;
        throttle = 0;
        velocity.set(0, 0, 0);
        return;
    }

    onGround = true;
    velocity.y = 0;
    if (brake) throttle = Math.max(0, throttle - 1.5 * deltaTime);
    target.rotation.x *= 0.9;
    target.rotation.z *= 0.9;
}

function resetPlane() {
    crashed = false;
    onGround = true;
    throttle = 0.35;
    velocity.set(0, 0, 0);
    target.position.set(0, 1.2, 0);
    target.rotation.set(0, 0, 0);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

this.dispose = function() {
    target = null;
    game = null;
};
