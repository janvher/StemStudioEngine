/**
 * BOAT / SUBMARINE CONTROLLER EXAMPLE
 *
 * Water vehicle controller with buoyancy simulation, wave response,
 * rudder steering, propeller thrust, and dive mechanics (submarine mode).
 * Demonstrates GameManager physics for fluid-like movement:
 *   - game.physics (setLinearVelocity, setRotation, applyCentralImpulse)
 *   - game.audioController (engine + water splash audio)
 *   - game.cameraControl (dynamic follow distance based on speed)
 *
 * Attach to a boat/submarine model. No special child objects required.
 *
 * behavior.json attributes:
 *   maxSpeed: 15, acceleration: 5, turnSpeed: 1.5,
 *   waterLevel: 0, buoyancyForce: 12, waveAmplitude: 0.3,
 *   waveFrequency: 1.5, dragCoefficient: 0.95,
 *   canDive: false, maxDepth: -20, diveSpeed: 3,
 *   engineSoundFile: "boat_engine", splashSoundFile: "water_splash"
 */

this.init = function (game) {
    this.game = game;

    // Movement state
    this.speed = 0;
    this.rudderAngle = 0;
    this.depth = 0;            // 0 = surface, negative = underwater
    this.roll = 0;             // wave-induced roll
    this.pitch = 0;            // speed-induced pitch

    // Wave simulation
    this.wavePhase = Math.random() * Math.PI * 2;

    // Input
    this.keys = {};
    this.onKeyDown = (e) => { this.keys[e.code] = true; };
    this.onKeyUp = (e) => { this.keys[e.code] = false; };

    // Audio
    this.engineAudioId = null;
    this.splashAudioId = null;

    // Reusable
    this._forward = new THREE.Vector3();
    this._velocity = new THREE.Vector3();
    this._euler = new THREE.Euler();
};

this.onStart = async function () {
    if (!this.target || !this.game) return;

    this.game.setPlayer(this.target);
    this.game.cameraControl.start(this.target);

    // Audio setup
    if (this.game.audioController) {
        const engineSound = this.attributes.engineSoundFile;
        if (engineSound) {
            try {
                this.engineAudioId = await this.game.audioController.loadAudioClip(engineSound);
                this.game.audioController.attachAudioClipToObject(this.engineAudioId, this.target);
                this.game.audioController.setAudioClipProperties(this.engineAudioId, {
                    positional: true, loop: true, volume: 0.3, rolloffFactor: 4
                });
                this.game.audioController.playAudioClip(this.engineAudioId);
            } catch (e) { /* sound optional */ }
        }

        const splashSound = this.attributes.splashSoundFile;
        if (splashSound) {
            try {
                this.splashAudioId = await this.game.audioController.loadAudioClip(splashSound);
                this.game.audioController.attachAudioClipToObject(this.splashAudioId, this.target);
                this.game.audioController.setAudioClipProperties(this.splashAudioId, {
                    positional: true, loop: false, volume: 0.5, rolloffFactor: 5
                });
            } catch (e) { /* sound optional */ }
        }
    }

    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
};

// -------------------------------------------------------------------
// Update — buoyancy, wave motion, propulsion, diving
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target || !this.game) return;

    const maxSpeed = this.attributes.maxSpeed || 15;
    const accel = this.attributes.acceleration || 5;
    const turnSpeed = this.attributes.turnSpeed || 1.5;
    const waterLevel = this.attributes.waterLevel || 0;
    const buoyancy = this.attributes.buoyancyForce || 12;
    const waveAmp = this.attributes.waveAmplitude || 0.3;
    const waveFreq = this.attributes.waveFrequency || 1.5;
    const drag = this.attributes.dragCoefficient || 0.95;
    const canDive = this.attributes.canDive || false;
    const maxDepth = this.attributes.maxDepth || -20;
    const diveSpeed = this.attributes.diveSpeed || 3;

    // Input
    const throttle = (this.keys["KeyW"] || this.keys["ArrowUp"]) ? 1 :
                     (this.keys["KeyS"] || this.keys["ArrowDown"]) ? -1 : 0;
    const steer = ((this.keys["KeyD"] || this.keys["ArrowRight"]) ? 1 : 0) -
                  ((this.keys["KeyA"] || this.keys["ArrowLeft"]) ? 1 : 0);
    const diveDown = this.keys["KeyQ"];
    const diveUp = this.keys["KeyE"];

    // -----------------------------------------------------------
    // Thrust
    // -----------------------------------------------------------
    this.speed += throttle * accel * deltaTime;
    this.speed *= drag; // water drag
    this.speed = Math.max(-maxSpeed * 0.3, Math.min(this.speed, maxSpeed));

    if (Math.abs(this.speed) < 0.05) this.speed = 0;

    // -----------------------------------------------------------
    // Rudder steering (speed-dependent — slower at low speed)
    // -----------------------------------------------------------
    const speedRatio = Math.abs(this.speed) / maxSpeed;
    this.rudderAngle = steer * turnSpeed * speedRatio * deltaTime;

    if (Math.abs(this.speed) > 0.5) {
        const yAxis = new THREE.Vector3(0, 1, 0);
        const turnQuat = new THREE.Quaternion().setFromAxisAngle(yAxis, this.rudderAngle);
        this.target.quaternion.multiply(turnQuat);
    }

    // -----------------------------------------------------------
    // Buoyancy + wave motion
    // -----------------------------------------------------------
    this.wavePhase += deltaTime * waveFreq;
    const waveHeight = Math.sin(this.wavePhase) * waveAmp;
    const waveRoll = Math.sin(this.wavePhase * 0.7) * 0.05; // gentle roll

    // Buoyancy: push toward water level
    const currentY = this.target.position.y;
    const targetY = waterLevel + waveHeight + this.depth;
    const buoyancyVelocity = (targetY - currentY) * buoyancy;

    // Speed-based pitch (nose dips into water at high speed)
    this.pitch = -speedRatio * 0.08;
    this.roll = waveRoll + steer * speedRatio * 0.1; // lean into turns

    // -----------------------------------------------------------
    // Submarine diving
    // -----------------------------------------------------------
    if (canDive) {
        if (diveDown) {
            this.depth = Math.max(this.depth - diveSpeed * deltaTime, maxDepth);
        }
        if (diveUp) {
            this.depth = Math.min(this.depth + diveSpeed * deltaTime, 0);
        }
    }

    // -----------------------------------------------------------
    // Apply velocity
    // -----------------------------------------------------------
    this._forward.set(0, 0, -1).applyQuaternion(this.target.quaternion);
    this._forward.y = 0; // keep horizontal thrust
    this._forward.normalize();

    this._velocity.copy(this._forward).multiplyScalar(this.speed);
    this._velocity.y = buoyancyVelocity;

    this.game.physics.setLinearVelocity(this.target.uuid, this._velocity);

    // -----------------------------------------------------------
    // Apply rotation (heading + wave roll + speed pitch)
    // -----------------------------------------------------------
    this._euler.set(this.pitch, 0, this.roll);
    const waveQuat = new THREE.Quaternion().setFromEuler(this._euler);
    const finalQuat = this.target.quaternion.clone().multiply(waveQuat);
    this.game.physics.setRotation(this.target.uuid, finalQuat);

    // -----------------------------------------------------------
    // Audio
    // -----------------------------------------------------------
    if (this.engineAudioId && this.game.audioController) {
        this.game.audioController.setAudioClipProperties(this.engineAudioId, {
            volume: 0.2 + speedRatio * 0.5
        });
    }

    // Splash sound when hitting water after being airborne
    if (this.splashAudioId && currentY > waterLevel + 0.5 && buoyancyVelocity < -2) {
        this.game.audioController.playAudioClip(this.splashAudioId);
    }
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.speed = 0;
    this.rudderAngle = 0;
    this.depth = 0;
    this.roll = 0;
    this.pitch = 0;
};

this.dispose = function () {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);

    if (this.engineAudioId && this.game?.audioController) {
        this.game.audioController.stopAudioClip(this.engineAudioId);
        this.game.audioController.disposeAudioClip(this.engineAudioId);
    }
    if (this.splashAudioId && this.game?.audioController) {
        this.game.audioController.disposeAudioClip(this.splashAudioId);
    }
};
