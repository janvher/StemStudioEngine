/**
 * PATROL ENEMY BEHAVIOR EXAMPLE
 *
 * State-machine enemy that patrols between waypoints, detects the player,
 * chases, attacks, and retreats. Mirrors the patterns used by the built-in
 * `enemy` pack behavior:
 *   - State enum with explicit transitions
 *   - Physics velocity for movement (setLinearVelocity, setRotation)
 *   - Animation controller for state-driven animations
 *   - CollisionDetector for player detection
 *   - game.behaviorManager.sendEventToObjectBehaviors for game-wide enemy events
 *   - Attribute-driven configuration
 *
 * behavior.json attributes:
 *   health: 100, patrolSpeed: 3, chaseSpeed: 6, attackDamage: 10,
 *   detectionRange: 12, attackRange: 2, retreatHealthThreshold: 20,
 *   idleAnimation: "idle", walkAnimation: "walk", runAnimation: "run",
 *   attackAnimation: "attack", dieAnimation: "die"
 */

// States
const STATE = {
    IDLE: "idle",
    PATROL: "patrol",
    CHASE: "chase",
    ATTACK: "attack",
    RETREAT: "retreat",
    DEAD: "dead"
};

this.init = function (game) {
    this.game = game;

    // Runtime state
    this.state = STATE.IDLE;
    this.currentHealth = 0;
    this.currentWaypoint = 0;
    this.attackCooldown = 0;
    this.stateTimer = 0;
    this.collisionListenerId = null;
    this.currentAnimation = null;

    // Reusable vectors (avoid per-frame allocations — same pattern as NPC pack)
    this._direction = new THREE.Vector3();
    this._velocity = new THREE.Vector3();
    this._targetQuat = new THREE.Quaternion();
    this._yAxis = new THREE.Vector3(0, 1, 0);
};

this.onStart = function () {
    if (!this.target || !this.game) return;

    this.currentHealth = this.attributes.health || 100;

    // Build waypoints from child empties named "Waypoint_0", "Waypoint_1", etc.
    this.waypoints = [];
    this.target.parent?.traverse((child) => {
        if (child.name && child.name.startsWith("Waypoint_")) {
            this.waypoints.push(child.position.clone());
        }
    });

    // Fallback: patrol in a small circle around spawn
    if (this.waypoints.length === 0) {
        const origin = this.target.position.clone();
        this.waypoints.push(origin.clone().add(new THREE.Vector3(5, 0, 0)));
        this.waypoints.push(origin.clone().add(new THREE.Vector3(0, 0, 5)));
        this.waypoints.push(origin.clone().add(new THREE.Vector3(-5, 0, 0)));
        this.waypoints.push(origin.clone().add(new THREE.Vector3(0, 0, -5)));
    }

    // Register collision listener for player detection
    this.collisionListenerId = this.game.collisionDetector.addListener(
        this.target,
        {
            type: COLLISION_TYPE.WITH_PLAYER,
            distanceThreshold: this.attributes.detectionRange || 12,
            callback: () => this.onPlayerDetected()
        },
        false // distance-based, not physics
    );

    // Start patrolling
    this.changeState(STATE.PATROL);

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "enemy.spawned", {
        uuid: this.target.uuid,
        health: this.currentHealth
    });
};

// -------------------------------------------------------------------
// State machine — same pattern as enemy pack
// -------------------------------------------------------------------

this.changeState = function (newState) {
    if (this.state === newState || this.state === STATE.DEAD) return;

    const prevState = this.state;
    this.state = newState;
    this.stateTimer = 0;

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "enemy.state.changed", {
        uuid: this.target.uuid,
        from: prevState,
        to: newState
    });

    // State entry — pick animation
    switch (newState) {
        case STATE.IDLE:
            this.playAnim(this.attributes.idleAnimation || "idle");
            this.stopMovement();
            break;
        case STATE.PATROL:
            this.playAnim(this.attributes.walkAnimation || "walk");
            break;
        case STATE.CHASE:
            this.playAnim(this.attributes.runAnimation || "run");
            this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "enemy.player.detected", { uuid: this.target.uuid });
            break;
        case STATE.ATTACK:
            this.playAnim(this.attributes.attackAnimation || "attack");
            this.stopMovement();
            break;
        case STATE.RETREAT:
            this.playAnim(this.attributes.runAnimation || "run");
            this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "enemy.player.lost", { uuid: this.target.uuid });
            break;
        case STATE.DEAD:
            this.playAnim(this.attributes.dieAnimation || "die", true);
            this.stopMovement();
            this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "enemy.died", { uuid: this.target.uuid });
            break;
    }
};

// -------------------------------------------------------------------
// Update — state-driven logic, physics movement
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target || !this.game || this.state === STATE.DEAD) return;

    this.stateTimer += deltaTime;
    this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

    const player = this.game.player;
    const playerPos = player?.position;
    const myPos = this.target.position;

    switch (this.state) {
        case STATE.PATROL:
            this.updatePatrol(deltaTime);
            // Check if player is close enough to chase
            if (playerPos) {
                const dist = myPos.distanceTo(playerPos);
                if (dist < (this.attributes.detectionRange || 12)) {
                    this.changeState(STATE.CHASE);
                }
            }
            break;

        case STATE.CHASE:
            if (!playerPos) { this.changeState(STATE.PATROL); break; }
            this.moveToward(playerPos, this.attributes.chaseSpeed || 6, deltaTime);
            // Close enough to attack?
            if (myPos.distanceTo(playerPos) < (this.attributes.attackRange || 2)) {
                this.changeState(STATE.ATTACK);
            }
            // Lost the player?
            if (myPos.distanceTo(playerPos) > (this.attributes.detectionRange || 12) * 1.5) {
                this.changeState(STATE.PATROL);
            }
            // Low health — retreat
            if (this.currentHealth < (this.attributes.retreatHealthThreshold || 20)) {
                this.changeState(STATE.RETREAT);
            }
            break;

        case STATE.ATTACK:
            if (!playerPos) { this.changeState(STATE.PATROL); break; }
            // Face the player while attacking
            this.faceTarget(playerPos, deltaTime);
            // Deal damage on cooldown
            if (this.attackCooldown <= 0) {
                this.attackCooldown = 1.0;
                this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "enemy.attack", {
                    uuid: this.target.uuid,
                    damage: this.attributes.attackDamage || 10
                });
                if (player) {
                    this.game.behaviorManager.sendEventToObjectBehaviors(player, "player.take_damage", {
                        amount: this.attributes.attackDamage || 10
                    });
                }
            }
            // Player moved out of range
            if (myPos.distanceTo(playerPos) > (this.attributes.attackRange || 2) * 1.5) {
                this.changeState(STATE.CHASE);
            }
            break;

        case STATE.RETREAT:
            if (playerPos) {
                // Move away from player
                this._direction.copy(myPos).sub(playerPos).normalize();
                const retreatTarget = myPos.clone().add(
                    this._direction.multiplyScalar(10)
                );
                this.moveToward(retreatTarget, this.attributes.chaseSpeed || 6, deltaTime);
            }
            // Retreated far enough — go back to patrol
            if (this.stateTimer > 5) {
                this.changeState(STATE.PATROL);
            }
            break;

        case STATE.IDLE:
            // Wait, then patrol
            if (this.stateTimer > 2) {
                this.changeState(STATE.PATROL);
            }
            break;
    }
};

// -------------------------------------------------------------------
// Movement — uses physics like the enemy/NPC packs
// -------------------------------------------------------------------

this.updatePatrol = function (deltaTime) {
    if (this.waypoints.length === 0) return;

    const target = this.waypoints[this.currentWaypoint];
    const dist = this.target.position.distanceTo(target);

    if (dist < 1.0) {
        // Reached waypoint — advance
        this.currentWaypoint = (this.currentWaypoint + 1) % this.waypoints.length;
        this.changeState(STATE.IDLE); // brief pause at each waypoint
        return;
    }

    this.moveToward(target, this.attributes.patrolSpeed || 3, deltaTime);
};

this.moveToward = function (targetPos, speed, deltaTime) {
    // Direction to target
    this._direction.copy(targetPos).sub(this.target.position);
    this._direction.y = 0; // stay on ground plane
    this._direction.normalize();

    // Face direction (smooth rotation — same as NPC pack)
    this.faceTarget(targetPos, deltaTime);

    // Set velocity via physics (same pattern as enemy/NPC packs)
    this._velocity.copy(this._direction).multiplyScalar(speed);
    this._velocity.y = -9.8; // gravity

    this.game.physics.setLinearVelocity(this.target.uuid, this._velocity);
};

this.faceTarget = function (targetPos, deltaTime) {
    this._direction.copy(targetPos).sub(this.target.position);
    this._direction.y = 0;
    if (this._direction.lengthSq() < 0.001) return;

    const angle = Math.atan2(this._direction.x, this._direction.z);
    this._targetQuat.setFromAxisAngle(this._yAxis, angle);

    // Smooth rotation (slerp — same as follow/NPC packs)
    this.target.quaternion.slerp(this._targetQuat, Math.min(5 * deltaTime, 1));
    this.game.physics.setRotation(this.target.uuid, this.target.quaternion);
};

this.stopMovement = function () {
    this.game.physics.setLinearVelocity(this.target.uuid, { x: 0, y: -9.8, z: 0 });
};

// -------------------------------------------------------------------
// Animation — same pattern as enemy/NPC packs
// -------------------------------------------------------------------

this.playAnim = function (name, playOnce) {
    if (!name || name === "none" || name === this.currentAnimation) return;
    this.currentAnimation = name;
    this.game.animationController.playAnimation(
        this.target,
        name,
        1,              // speed
        !!playOnce,     // playOnce
        0.25            // fadeDuration
    );
};

// -------------------------------------------------------------------
// Damage — onEvent handler
// -------------------------------------------------------------------

this.onEvent = function (msg, data) {
    if (this.state === STATE.DEAD) return;

    if (msg === "enemy.take_damage") {
        this.currentHealth -= data?.amount || 0;
        this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "enemy.got.hit", {
            uuid: this.target.uuid,
            health: this.currentHealth
        });

        if (this.currentHealth <= 0) {
            this.changeState(STATE.DEAD);
        }
    }
};

this.onPlayerDetected = function () {
    if (this.state === STATE.PATROL || this.state === STATE.IDLE) {
        this.changeState(STATE.CHASE);
    }
};

// -------------------------------------------------------------------
// Cleanup
// -------------------------------------------------------------------

this.onReset = function () {
    this.currentHealth = this.attributes.health || 100;
    this.currentWaypoint = 0;
    this.attackCooldown = 0;
    this.changeState(STATE.PATROL);
};

this.dispose = function () {
    if (this.collisionListenerId) {
        this.game.collisionDetector.deleteListener(this.target, this.collisionListenerId);
    }
    this.waypoints = null;
};
