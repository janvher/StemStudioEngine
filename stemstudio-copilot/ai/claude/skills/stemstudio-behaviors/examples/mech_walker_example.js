/**
 * MECH WALKER CONTROLLER EXAMPLE
 *
 * Bipedal mech/robot controller with weighted movement, torso rotation
 * independent of legs, weapon systems, and stomp mechanics. Demonstrates
 * GameManager integration for heavy vehicle gameplay:
 *   - game.physics (applyCentralImpulse for stomp, setLinearVelocity)
 *   - game.animationController (blended walk + torso rotation)
 *   - game.collisionDetector (ground slam detection)
 *   - game.objectPicker (weapon targeting)
 *   - game.behaviorManager.sendEventToObjectBehaviors (weapon fire, damage dealing, stomp shockwave)
 *
 * Attach to a mech model. Optional children: "Torso", "WeaponMount",
 * "LeftLeg", "RightLeg", "CockpitCam".
 *
 * behavior.json attributes:
 *   walkSpeed: 6, runSpeed: 10, turnSpeed: 1.2,
 *   torsoTurnSpeed: 3, maxTorsoAngle: 1.57,
 *   weaponCooldown: 0.3, weaponDamage: 25, weaponRange: 50,
 *   stompDamage: 50, stompRadius: 5, stompCooldown: 3,
 *   mass: 500, walkAnimation: "walk", idleAnimation: "idle",
 *   runAnimation: "run", stompAnimation: "stomp"
 */

this.init = function (game) {
    this.game = game;

    // Movement
    this.speed = 0;
    this.torsoYaw = 0;       // torso rotation offset from legs (radians)
    this.isRunning = false;

    // Weapon
    this.weaponTimer = 0;
    this.isFiring = false;

    // Stomp
    this.stompTimer = 0;
    this.isStomping = false;

    // Parts
    this.torso = null;
    this.weaponMount = null;

    // Input
    this.keys = {};
    this.mouseX = 0;
    this.onKeyDown = (e) => { this.keys[e.code] = true; };
    this.onKeyUp = (e) => { this.keys[e.code] = false; };
    this.onMouseMove = (e) => {
        if (document.pointerLockElement) {
            this.mouseX += e.movementX * 0.003;
        }
    };
    this.onClick = () => { this.isFiring = true; };

    // Reusable
    this._forward = new THREE.Vector3();
    this._velocity = new THREE.Vector3();
    this._raycaster = new THREE.Raycaster();
};

this.onStart = async function () {
    if (!this.target || !this.game) return;

    this.game.setPlayer(this.target);

    // Find mech parts
    this.target.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name.includes("torso")) this.torso = child;
        else if (name.includes("weapon")) this.weaponMount = child;
    });

    // Setup camera
    this.game.cameraControl.start(this.target);

    // Input
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("click", this.onClick);

    // Request pointer lock for mouse look
    try {
        await this.game.cameraControl.requestPointerLock();
    } catch (e) { /* optional */ }
};

// -------------------------------------------------------------------
// Update — legs movement, torso aim, weapons, stomp
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target || !this.game) return;

    this.weaponTimer = Math.max(0, this.weaponTimer - deltaTime);
    this.stompTimer = Math.max(0, this.stompTimer - deltaTime);

    // Input
    const forward = (this.keys["KeyW"] ? 1 : 0) + (this.keys["KeyS"] ? -1 : 0);
    const strafe = (this.keys["KeyD"] ? 1 : 0) + (this.keys["KeyA"] ? -1 : 0);
    this.isRunning = this.keys["ShiftLeft"];
    const wantStomp = this.keys["KeyF"];

    const walkSpeed = this.attributes.walkSpeed || 6;
    const runSpeed = this.attributes.runSpeed || 10;
    const turnSpeed = this.attributes.turnSpeed || 1.2;
    const torsoTurnSpeed = this.attributes.torsoTurnSpeed || 3;
    const maxTorsoAngle = this.attributes.maxTorsoAngle || 1.57;

    // -----------------------------------------------------------
    // Leg rotation (WASD turns the whole mech body)
    // -----------------------------------------------------------
    if (strafe !== 0 && Math.abs(this.speed) > 0.5) {
        const yAxis = new THREE.Vector3(0, 1, 0);
        const turnQuat = new THREE.Quaternion().setFromAxisAngle(
            yAxis, -strafe * turnSpeed * deltaTime
        );
        this.target.quaternion.multiply(turnQuat);
        this.game.physics.setRotation(this.target.uuid, this.target.quaternion);
    }

    // -----------------------------------------------------------
    // Torso rotation (mouse X — independent of legs)
    // -----------------------------------------------------------
    const targetTorsoYaw = THREE.MathUtils.clamp(this.mouseX, -maxTorsoAngle, maxTorsoAngle);
    this.torsoYaw = THREE.MathUtils.lerp(this.torsoYaw, targetTorsoYaw, torsoTurnSpeed * deltaTime);

    if (this.torso) {
        this.torso.rotation.y = this.torsoYaw;
    }

    // -----------------------------------------------------------
    // Locomotion (heavy, weighted feel)
    // -----------------------------------------------------------
    const targetSpeed = forward * (this.isRunning ? runSpeed : walkSpeed);

    // Heavy acceleration/deceleration (mech inertia)
    const accelRate = this.isRunning ? 4 : 3;
    const decelRate = 5;

    if (forward !== 0) {
        this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, accelRate * deltaTime);
    } else {
        this.speed = THREE.MathUtils.lerp(this.speed, 0, decelRate * deltaTime);
        if (Math.abs(this.speed) < 0.1) this.speed = 0;
    }

    // Apply velocity
    this._forward.set(0, 0, -1).applyQuaternion(this.target.quaternion);
    this._velocity.copy(this._forward).multiplyScalar(this.speed);
    this._velocity.y = -15; // heavy mech gravity
    this.game.physics.setLinearVelocity(this.target.uuid, this._velocity);

    // -----------------------------------------------------------
    // Animation blending (walk/run based on speed)
    // -----------------------------------------------------------
    const absSpeed = Math.abs(this.speed);
    const walkAnim = this.attributes.walkAnimation || "walk";
    const runAnim = this.attributes.runAnimation || "run";
    const idleAnim = this.attributes.idleAnimation || "idle";

    if (absSpeed > 0.5) {
        const runWeight = Math.min(absSpeed / runSpeed, 1);
        const walkWeight = 1 - runWeight;

        this.game.animationController.playBlendedAnimations(this.target, [
            { name: walkAnim, weight: walkWeight, speed: absSpeed / walkSpeed },
            { name: runAnim, weight: runWeight, speed: absSpeed / runSpeed }
        ]);
    } else {
        this.game.animationController.playAnimation(this.target, idleAnim, 1);
    }

    // -----------------------------------------------------------
    // Weapon fire (click to shoot)
    // -----------------------------------------------------------
    if (this.isFiring) {
        this.isFiring = false;
        this.fireWeapon();
    }

    // -----------------------------------------------------------
    // Ground stomp (F key)
    // -----------------------------------------------------------
    if (wantStomp && this.stompTimer <= 0 && !this.isStomping) {
        this.groundStomp();
    }
};

// -------------------------------------------------------------------
// Weapon system — raycast from torso/weapon mount
// -------------------------------------------------------------------

this.fireWeapon = function () {
    if (this.weaponTimer > 0) return;
    this.weaponTimer = this.attributes.weaponCooldown || 0.3;

    // Raycast from weapon mount (or torso center)
    const origin = (this.weaponMount || this.torso || this.target).getWorldPosition(new THREE.Vector3());
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.target.quaternion);

    // Apply torso rotation to aim direction
    if (this.torsoYaw !== 0) {
        const torsoQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), this.torsoYaw
        );
        direction.applyQuaternion(torsoQuat);
    }

    this._raycaster.set(origin, direction.normalize());
    this._raycaster.far = this.attributes.weaponRange || 50;

    const hits = this._raycaster.intersectObjects(this.game.scene.children, true);
    const hit = hits.find(h => h.object !== this.target && !this.target.getObjectById(h.object.id));

    if (hit) {
        // Find the root object (skip mesh children)
        let hitRoot = hit.object;
        while (hitRoot.parent && hitRoot.parent !== this.game.scene) {
            hitRoot = hitRoot.parent;
        }

        this.game.behaviorManager.sendEventToObjectBehaviors(hitRoot, "enemy.take_damage", {
            uuid: hitRoot.uuid,
            amount: this.attributes.weaponDamage || 25,
            hitPoint: hit.point
        });
    }

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "weapon.fired", {
        uuid: this.target.uuid,
        origin: origin,
        direction: direction,
        hit: hit ? hit.point : null
    });
};

// -------------------------------------------------------------------
// Ground stomp — area damage using physics impulse
// -------------------------------------------------------------------

this.groundStomp = function () {
    this.isStomping = true;
    this.stompTimer = this.attributes.stompCooldown || 3;

    // Play stomp animation
    const stompAnim = this.attributes.stompAnimation || "stomp";
    this.game.animationController.playAnimation(
        this.target, stompAnim, 1, true, 0.15,
        () => { this.isStomping = false; }
    );

    // Apply downward impulse to self (slam)
    this.game.physics.applyCentralImpulse(
        this.target.uuid,
        new THREE.Vector3(0, -(this.attributes.mass || 500) * 2, 0)
    );

    // Shockwave — find nearby dynamic objects and push them
    const stompRadius = this.attributes.stompRadius || 5;
    const stompPos = this.target.position;

    this.game.scene.traverse((child) => {
        if (child === this.target || !child.userData?.physics?.enabled) return;
        if (child.userData.physics.ctype !== "Dynamic") return;

        const dist = child.position.distanceTo(stompPos);
        if (dist < stompRadius && dist > 0.1) {
            const pushDir = child.position.clone().sub(stompPos).normalize();
            const force = (1 - dist / stompRadius) * (this.attributes.stompDamage || 50) * 10;
            pushDir.y = 0.5; // upward component
            pushDir.normalize().multiplyScalar(force);

            this.game.physics.applyCentralImpulse(child.uuid, pushDir);

            this.game.behaviorManager.sendEventToObjectBehaviors(child, "enemy.take_damage", {
                uuid: child.uuid,
                amount: this.attributes.stompDamage || 50
            });
        }
    });

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "mech.stomp", {
        uuid: this.target.uuid,
        position: stompPos.clone(),
        radius: stompRadius
    });
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.speed = 0;
    this.torsoYaw = 0;
    this.mouseX = 0;
    this.weaponTimer = 0;
    this.stompTimer = 0;
    this.isStomping = false;
};

this.dispose = function () {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("click", this.onClick);

    this.game?.cameraControl?.unlockPointerLock();
};
