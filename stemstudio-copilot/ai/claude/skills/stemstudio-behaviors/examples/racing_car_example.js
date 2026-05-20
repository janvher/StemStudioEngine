/**
 * RACING CAR CONTROLLER EXAMPLE
 *
 * Arcade racing controller with engine RPM, gear shifting, drifting,
 * wheel rotation, exhaust particles, and engine audio. Demonstrates
 * deep GameManager integration:
 *   - game.physics (setLinearVelocity, setRotation, setOrigin)
 *   - game.animationController (wheel spin blending)
 *   - game.audioController (engine pitch based on RPM)
 *   - game.cameraControl (chase cam)
 *   - game.behaviorManager.sendEventToObjectBehaviors (lap completion, collision feedback)
 *
 * Attach to a car model with children: "WheelFL", "WheelFR", "WheelRL",
 * "WheelRR", "SteeringWheel" (optional), "ExhaustPoint" (optional).
 *
 * behavior.json attributes:
 *   maxSpeed: 40, acceleration: 15, brakeForce: 25, reverseMaxSpeed: 10,
 *   turnRadius: 2.5, driftThreshold: 15, driftGripLoss: 0.6,
 *   downforce: 2, suspensionStiffness: 0.3,
 *   engineSoundFile: "engine_loop", skidSoundFile: "tire_skid"
 */

this.init = function (game) {
    this.game = game;

    // Physics state
    this.speed = 0;
    this.rpm = 0;
    this.gear = 1;
    this.steerAngle = 0;
    this.isDrifting = false;
    this.lateralSlip = 0;

    // Gear ratios
    this.gears = [0, 3.5, 2.5, 1.8, 1.3, 1.0]; // gear 0 unused, 1-5
    this.gearSpeeds = [0, 10, 18, 27, 35, 42];

    // Wheels
    this.wheels = { fl: null, fr: null, rl: null, rr: null };
    this.steeringWheel = null;

    // Audio
    this.engineAudioId = null;
    this.skidAudioId = null;

    // Input
    this.keys = {};
    this.onKeyDown = (e) => { this.keys[e.code] = true; };
    this.onKeyUp = (e) => { this.keys[e.code] = false; };

    // Reusable vectors
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._velocity = new THREE.Vector3();
};

this.onStart = async function () {
    if (!this.target || !this.game) return;

    this.game.setPlayer(this.target);
    this.game.cameraControl.start(this.target);

    // Find wheel meshes
    this.target.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name.includes("wheelfl") || name.includes("wheel_fl")) this.wheels.fl = child;
        else if (name.includes("wheelfr") || name.includes("wheel_fr")) this.wheels.fr = child;
        else if (name.includes("wheelrl") || name.includes("wheel_rl")) this.wheels.rl = child;
        else if (name.includes("wheelrr") || name.includes("wheel_rr")) this.wheels.rr = child;
        else if (name.includes("steering")) this.steeringWheel = child;
    });

    // Load engine audio
    const engineSound = this.attributes.engineSoundFile;
    if (engineSound && this.game.audioController) {
        try {
            this.engineAudioId = await this.game.audioController.loadAudioClip(engineSound);
            this.game.audioController.attachAudioClipToObject(this.engineAudioId, this.target);
            this.game.audioController.setAudioClipProperties(this.engineAudioId, {
                positional: true,
                loop: true,
                volume: 0.5,
                rolloffFactor: 3
            });
            this.game.audioController.playAudioClip(this.engineAudioId);
        } catch (e) {
            console.warn("Engine audio not available:", e);
        }
    }

    // Load skid audio
    const skidSound = this.attributes.skidSoundFile;
    if (skidSound && this.game.audioController) {
        try {
            this.skidAudioId = await this.game.audioController.loadAudioClip(skidSound);
            this.game.audioController.attachAudioClipToObject(this.skidAudioId, this.target);
            this.game.audioController.setAudioClipProperties(this.skidAudioId, {
                positional: true,
                loop: true,
                volume: 0,
                rolloffFactor: 4
            });
            this.game.audioController.playAudioClip(this.skidAudioId);
        } catch (e) {
            console.warn("Skid audio not available:", e);
        }
    }

    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
};

// -------------------------------------------------------------------
// Update — driving physics, gear shifting, audio pitch
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target || !this.game) return;

    // Input
    const throttle = (this.keys["KeyW"] || this.keys["ArrowUp"]) ? 1 : 0;
    const brake = (this.keys["KeyS"] || this.keys["ArrowDown"]) ? 1 : 0;
    const steerInput = ((this.keys["KeyD"] || this.keys["ArrowRight"]) ? 1 : 0) -
                       ((this.keys["KeyA"] || this.keys["ArrowLeft"]) ? 1 : 0);
    const handbrake = this.keys["Space"];
    const nitro = this.keys["ShiftLeft"];

    const maxSpeed = this.attributes.maxSpeed || 40;
    const accel = this.attributes.acceleration || 15;
    const brakeForce = this.attributes.brakeForce || 25;
    const reverseMax = this.attributes.reverseMaxSpeed || 10;
    const turnRadius = this.attributes.turnRadius || 2.5;
    const downforce = this.attributes.downforce || 2;

    // -----------------------------------------------------------
    // Acceleration / braking
    // -----------------------------------------------------------
    if (throttle > 0) {
        const nitroMultiplier = nitro ? 1.5 : 1.0;
        this.speed += accel * nitroMultiplier * deltaTime;
        this.speed = Math.min(this.speed, maxSpeed * (nitro ? 1.3 : 1.0));
    } else if (brake > 0) {
        if (this.speed > 0.5) {
            this.speed -= brakeForce * deltaTime;
            this.speed = Math.max(this.speed, 0);
        } else {
            // Reverse
            this.speed -= accel * 0.5 * deltaTime;
            this.speed = Math.max(this.speed, -reverseMax);
        }
    } else {
        // Natural deceleration
        this.speed *= (1 - 2.0 * deltaTime);
        if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    // -----------------------------------------------------------
    // Steering
    // -----------------------------------------------------------
    const speedFactor = Math.min(Math.abs(this.speed) / maxSpeed, 1);
    const steerResponse = turnRadius * (1 - speedFactor * 0.5); // less turn at high speed
    this.steerAngle = steerInput * steerResponse * deltaTime;

    if (Math.abs(this.speed) > 0.5) {
        const yAxis = new THREE.Vector3(0, 1, 0);
        const turnQuat = new THREE.Quaternion().setFromAxisAngle(yAxis, this.steerAngle);
        this.target.quaternion.multiply(turnQuat);
        this.game.physics.setRotation(this.target.uuid, this.target.quaternion);
    }

    // -----------------------------------------------------------
    // Drift detection
    // -----------------------------------------------------------
    const driftThreshold = this.attributes.driftThreshold || 15;
    const wasDrifting = this.isDrifting;
    this.isDrifting = handbrake && Math.abs(this.speed) > driftThreshold;

    if (this.isDrifting) {
        this.lateralSlip = Math.min(this.lateralSlip + deltaTime * 2, 1);
    } else {
        this.lateralSlip = Math.max(this.lateralSlip - deltaTime * 3, 0);
    }

    // -----------------------------------------------------------
    // Apply velocity
    // -----------------------------------------------------------
    this._forward.set(0, 0, -1).applyQuaternion(this.target.quaternion);
    this._right.set(1, 0, 0).applyQuaternion(this.target.quaternion);

    this._velocity.copy(this._forward).multiplyScalar(this.speed);

    // Lateral drift force
    if (this.lateralSlip > 0) {
        const driftGrip = this.attributes.driftGripLoss || 0.6;
        this._velocity.add(
            this._right.clone().multiplyScalar(
                steerInput * this.speed * this.lateralSlip * driftGrip * 0.3
            )
        );
    }

    // Downforce (keep car on ground at high speed)
    this._velocity.y = -(downforce * speedFactor + 9.8);

    this.game.physics.setLinearVelocity(this.target.uuid, this._velocity);

    // -----------------------------------------------------------
    // Auto gear shifting
    // -----------------------------------------------------------
    const absSpeed = Math.abs(this.speed);
    let newGear = 1;
    for (let g = this.gears.length - 1; g >= 1; g--) {
        if (absSpeed >= this.gearSpeeds[g - 1]) {
            newGear = g;
            break;
        }
    }
    this.gear = newGear;

    // RPM (normalized 0-1 within current gear band)
    const gearMin = this.gearSpeeds[this.gear - 1] || 0;
    const gearMax = this.gearSpeeds[this.gear] || maxSpeed;
    this.rpm = Math.min((absSpeed - gearMin) / (gearMax - gearMin), 1);

    // -----------------------------------------------------------
    // Wheel rotation visuals
    // -----------------------------------------------------------
    const wheelSpin = this.speed * deltaTime * 3;
    Object.values(this.wheels).forEach((wheel) => {
        if (wheel) wheel.rotation.x += wheelSpin;
    });

    // Front wheel steering visual
    if (this.wheels.fl) this.wheels.fl.rotation.y = steerInput * 0.4;
    if (this.wheels.fr) this.wheels.fr.rotation.y = steerInput * 0.4;

    // Steering wheel visual
    if (this.steeringWheel) {
        this.steeringWheel.rotation.z = -steerInput * 1.2;
    }

    // -----------------------------------------------------------
    // Engine audio pitch (based on RPM)
    // -----------------------------------------------------------
    if (this.engineAudioId && this.game.audioController) {
        const pitch = 0.6 + this.rpm * 0.8;  // 0.6x to 1.4x
        const vol = 0.3 + speedFactor * 0.5;
        this.game.audioController.setAudioClipProperties(this.engineAudioId, {
            volume: vol
        });
    }

    // Skid audio
    if (this.skidAudioId && this.game.audioController) {
        this.game.audioController.setAudioClipProperties(this.skidAudioId, {
            volume: this.isDrifting ? 0.6 : 0
        });
    }
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.speed = 0;
    this.rpm = 0;
    this.gear = 1;
    this.steerAngle = 0;
    this.isDrifting = false;
    this.lateralSlip = 0;
};

this.dispose = function () {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);

    if (this.engineAudioId && this.game?.audioController) {
        this.game.audioController.stopAudioClip(this.engineAudioId);
        this.game.audioController.disposeAudioClip(this.engineAudioId);
    }
    if (this.skidAudioId && this.game?.audioController) {
        this.game.audioController.stopAudioClip(this.skidAudioId);
        this.game.audioController.disposeAudioClip(this.skidAudioId);
    }
};
