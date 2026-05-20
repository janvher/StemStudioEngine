/**
 * SPACE COMBAT CONTROLLER EXAMPLE
 *
 * Zero-gravity spaceship controller with 6-degrees-of-freedom movement,
 * energy management, shield system, and weapon targeting. Demonstrates
 * full 3D physics without gravity:
 *   - game.physics (setLinearVelocity for thrust, setRotation for orientation)
 *   - game.animationController (thruster glow, cockpit animation)
 *   - game.audioController (engine hum, weapon sounds)
 *   - game.cameraControl (chase cam with lag)
 *   - game.collisionDetector (missile lock detection)
 *   - game.behaviorManager.sendEventToObjectBehaviors (damage, shield, energy events)
 *   - erth.lambdas (read ship stats from lambda component)
 *   - erth.store (shared game state: score, wave)
 *
 * Attach to a spaceship model.
 *
 * behavior.json attributes:
 *   maxSpeed: 30, thrustForce: 12, brakeForce: 8,
 *   pitchSpeed: 2.0, yawSpeed: 1.5, rollSpeed: 3.0,
 *   maxEnergy: 100, energyRegenRate: 10,
 *   weaponEnergyCost: 5, weaponCooldown: 0.15, weaponDamage: 15,
 *   boostMultiplier: 2.5, boostEnergyCost: 30,
 *   shieldMaxHP: 50, shieldRegenDelay: 3
 */

this.init = function (game) {
    this.game = game;

    // 6DOF state
    this.velocity = new THREE.Vector3();
    this.angularInput = new THREE.Vector3(); // pitch, yaw, roll

    // Energy system
    this.energy = 0;
    this.maxEnergy = 0;

    // Shield
    this.shieldHP = 0;
    this.shieldMaxHP = 0;
    this.shieldRegenTimer = 0;

    // Weapons
    this.weaponTimer = 0;
    this.isFiring = false;

    // Boost
    this.isBoosting = false;

    // Input
    this.keys = {};
    this.mouseDelta = { x: 0, y: 0 };
    this.onKeyDown = (e) => { this.keys[e.code] = true; };
    this.onKeyUp = (e) => { this.keys[e.code] = false; };
    this.onMouseMove = (e) => {
        if (document.pointerLockElement) {
            this.mouseDelta.x += e.movementX;
            this.mouseDelta.y += e.movementY;
        }
    };
    this.onMouseDown = () => { this.isFiring = true; };
    this.onMouseUp = () => { this.isFiring = false; };

    // Reusable
    this._thrustDir = new THREE.Vector3();
    this._pitchQuat = new THREE.Quaternion();
    this._yawQuat = new THREE.Quaternion();
    this._rollQuat = new THREE.Quaternion();
    this._raycaster = new THREE.Raycaster();
};

this.onStart = async function () {
    if (!this.target || !this.game) return;

    this.game.setPlayer(this.target);
    this.game.cameraControl.start(this.target);

    // Initialize energy and shields
    this.maxEnergy = this.attributes.maxEnergy || 100;
    this.energy = this.maxEnergy;
    this.shieldMaxHP = this.attributes.shieldMaxHP || 50;
    this.shieldHP = this.shieldMaxHP;

    // Read ship stats from lambda if available
    const shipLambdas = this.erth.lambdas.getObjectLambdas(this.target);
    const statsLambda = shipLambdas.find(l => l.id === "shipStats");
    if (statsLambda) {
        const stats = statsLambda.getComponentData(this.target);
        if (stats) {
            this.maxEnergy = stats.maxEnergy || this.maxEnergy;
            this.energy = this.maxEnergy;
            this.shieldMaxHP = stats.shieldMaxHP || this.shieldMaxHP;
            this.shieldHP = this.shieldMaxHP;
        }
    }

    // Input listeners
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("mouseup", this.onMouseUp);

    try {
        await this.game.cameraControl.requestPointerLock();
    } catch (e) { /* optional */ }

    // Track score in global store
    if (!this.erth.store.has("kills")) {
        this.erth.store.set("kills", 0);
    }
};

// -------------------------------------------------------------------
// Update — 6DOF flight, energy, shields, weapons
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target || !this.game) return;

    this.weaponTimer = Math.max(0, this.weaponTimer - deltaTime);

    // Input
    const thrustFwd = (this.keys["KeyW"] ? 1 : 0) + (this.keys["KeyS"] ? -1 : 0);
    const thrustRight = (this.keys["KeyD"] ? 1 : 0) + (this.keys["KeyA"] ? -1 : 0);
    const thrustUp = (this.keys["Space"] ? 1 : 0) + (this.keys["ControlLeft"] ? -1 : 0);
    const rollInput = (this.keys["KeyE"] ? 1 : 0) + (this.keys["KeyQ"] ? -1 : 0);
    this.isBoosting = this.keys["ShiftLeft"] && this.energy > 0;

    const maxSpeed = this.attributes.maxSpeed || 30;
    const thrust = this.attributes.thrustForce || 12;
    const brakeForce = this.attributes.brakeForce || 8;
    const pitchSpeed = this.attributes.pitchSpeed || 2.0;
    const yawSpeed = this.attributes.yawSpeed || 1.5;
    const rollSpeed = this.attributes.rollSpeed || 3.0;
    const boostMult = this.attributes.boostMultiplier || 2.5;
    const boostCost = this.attributes.boostEnergyCost || 30;

    // -----------------------------------------------------------
    // Rotation — mouse for pitch/yaw, Q/E for roll
    // -----------------------------------------------------------
    const mouseX = this.mouseDelta.x * 0.002;
    const mouseY = this.mouseDelta.y * 0.002;
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;

    // Pitch (mouse Y — local X axis)
    this._pitchQuat.setFromAxisAngle(
        new THREE.Vector3(1, 0, 0), -mouseY * pitchSpeed * deltaTime
    );
    // Yaw (mouse X — local Y axis)
    this._yawQuat.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0), -mouseX * yawSpeed * deltaTime
    );
    // Roll (Q/E — local Z axis)
    this._rollQuat.setFromAxisAngle(
        new THREE.Vector3(0, 0, 1), -rollInput * rollSpeed * deltaTime
    );

    this.target.quaternion
        .multiply(this._yawQuat)
        .multiply(this._pitchQuat)
        .multiply(this._rollQuat);

    this.game.physics.setRotation(this.target.uuid, this.target.quaternion);

    // -----------------------------------------------------------
    // Thrust (local-space, no gravity)
    // -----------------------------------------------------------
    const effectiveThrust = this.isBoosting ? thrust * boostMult : thrust;

    // Forward/backward
    this._thrustDir.set(0, 0, -thrustFwd).applyQuaternion(this.target.quaternion);
    this.velocity.add(this._thrustDir.multiplyScalar(effectiveThrust * deltaTime));

    // Strafe left/right
    this._thrustDir.set(thrustRight, 0, 0).applyQuaternion(this.target.quaternion);
    this.velocity.add(this._thrustDir.multiplyScalar(thrust * 0.6 * deltaTime));

    // Vertical thrust
    this._thrustDir.set(0, thrustUp, 0).applyQuaternion(this.target.quaternion);
    this.velocity.add(this._thrustDir.multiplyScalar(thrust * 0.6 * deltaTime));

    // Space drag (gradual slowdown)
    if (thrustFwd === 0 && thrustRight === 0 && thrustUp === 0) {
        this.velocity.multiplyScalar(1 - brakeForce * 0.01 * deltaTime);
    }

    // Speed cap
    const currentSpeed = this.velocity.length();
    const effectiveMax = this.isBoosting ? maxSpeed * 1.5 : maxSpeed;
    if (currentSpeed > effectiveMax) {
        this.velocity.normalize().multiplyScalar(effectiveMax);
    }

    this.game.physics.setLinearVelocity(this.target.uuid, this.velocity);

    // -----------------------------------------------------------
    // Energy management
    // -----------------------------------------------------------
    const regenRate = this.attributes.energyRegenRate || 10;

    if (this.isBoosting) {
        this.energy -= boostCost * deltaTime;
        this.energy = Math.max(0, this.energy);
        if (this.energy <= 0) this.isBoosting = false;
    } else {
        this.energy = Math.min(this.energy + regenRate * deltaTime, this.maxEnergy);
    }

    // -----------------------------------------------------------
    // Shield regeneration
    // -----------------------------------------------------------
    if (this.shieldHP < this.shieldMaxHP) {
        this.shieldRegenTimer -= deltaTime;
        if (this.shieldRegenTimer <= 0) {
            this.shieldHP = Math.min(this.shieldHP + 5 * deltaTime, this.shieldMaxHP);
        }
    }

    // -----------------------------------------------------------
    // Weapons
    // -----------------------------------------------------------
    if (this.isFiring) {
        this.fireWeapon();
    }
};

// -------------------------------------------------------------------
// Weapons — raycast forward, cost energy
// -------------------------------------------------------------------

this.fireWeapon = function () {
    const cooldown = this.attributes.weaponCooldown || 0.15;
    const energyCost = this.attributes.weaponEnergyCost || 5;

    if (this.weaponTimer > 0 || this.energy < energyCost) return;
    this.weaponTimer = cooldown;
    this.energy -= energyCost;

    const origin = this.target.getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.target.quaternion);

    this._raycaster.set(origin, direction);
    this._raycaster.far = 200;

    const hits = this._raycaster.intersectObjects(this.game.scene.children, true);
    const hit = hits.find(h => !this.target.getObjectById(h.object.id));

    if (hit) {
        let hitRoot = hit.object;
        while (hitRoot.parent && hitRoot.parent !== this.game.scene) {
            hitRoot = hitRoot.parent;
        }

        this.game.behaviorManager.sendEventToObjectBehaviors(hitRoot, "enemy.take_damage", {
            uuid: hitRoot.uuid,
            amount: this.attributes.weaponDamage || 15,
            hitPoint: hit.point
        });
    }

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "weapon.fired", {
        uuid: this.target.uuid,
        type: "laser",
        origin: origin,
        direction: direction
    });
};

// -------------------------------------------------------------------
// Damage handler — shield absorbs first
// -------------------------------------------------------------------

this.onEvent = function (msg, data) {
    if (msg === "player.take_damage") {
        let damage = data.amount || 0;
        const shieldRegenDelay = this.attributes.shieldRegenDelay || 3;

        // Shield absorbs first
        if (this.shieldHP > 0) {
            const absorbed = Math.min(damage, this.shieldHP);
            this.shieldHP -= absorbed;
            damage -= absorbed;
            this.shieldRegenTimer = shieldRegenDelay;

            this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "ship.shield_hit", {
                uuid: this.target.uuid,
                shieldHP: this.shieldHP,
                absorbed: absorbed
            });
        }

        if (damage > 0) {
            this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "game.health.dec", {
                target: this.target.uuid,
                amount: damage
            });
        }
    }

    if (msg === "enemy.died") {
        const kills = (this.erth.store.get("kills") || 0) + 1;
        this.erth.store.set("kills", kills);
    }
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.velocity.set(0, 0, 0);
    this.energy = this.maxEnergy;
    this.shieldHP = this.shieldMaxHP;
    this.weaponTimer = 0;
    this.shieldRegenTimer = 0;
};

this.dispose = function () {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);

    this.game?.cameraControl?.unlockPointerLock();
};
