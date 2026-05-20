/**
 * MOVING PLATFORM BEHAVIOR EXAMPLE
 *
 * Tween-driven moving platform that carries the player. Mirrors the patterns
 * used by the built-in `platform` pack behavior:
 *   - Attribute-driven displacement, speed, and loop mode
 *   - startOnTrigger pattern (waits for trigger activation via onEvent)
 *   - Tween-based smooth movement with easing
 *   - Player detection (standing on platform) with speed adjustment
 *   - Physics sync after each tween step
 *   - Behavior event notifications for platform state changes
 *
 * behavior.json attributes:
 *   startOnTrigger: false, move: {x:0, y:5, z:0}, speed: 3,
 *   loopMode: "Loop", easing: "sineInOut", pauseAtEnds: 0.5
 */

this.init = function (game) {
    this.game = game;

    // Tween state
    this.isActive = false;
    this.progress = 0;        // 0 = start, 1 = end
    this.direction = 1;       // 1 = forward, -1 = backward
    this.pauseTimer = 0;
    this.isPaused = false;

    // Positions
    this.startPos = new THREE.Vector3();
    this.endPos = new THREE.Vector3();
    this.currentPos = new THREE.Vector3();
    this.lastPos = new THREE.Vector3();

    // Player tracking
    this.playerOnPlatform = false;
    this._platformVelocity = new THREE.Vector3();
};

this.onStart = function () {
    if (!this.target || !this.game) return;

    // Store start position
    this.startPos.copy(this.target.position);

    // Calculate end position from displacement attribute (rotated by object orientation)
    const move = this.attributes.move || { x: 0, y: 5, z: 0 };
    const displacement = new THREE.Vector3(move.x, move.y, move.z);
    displacement.applyQuaternion(this.target.quaternion);
    this.endPos.copy(this.startPos).add(displacement);

    this.lastPos.copy(this.startPos);

    // Auto-start if not waiting for trigger
    if (!this.attributes.startOnTrigger) {
        this.activate();
    }
};

// -------------------------------------------------------------------
// Trigger pattern — same as platform/tween/spawn packs
// -------------------------------------------------------------------

this.onEvent = function (msg, data) {
    if (msg === "trigger") {
        if (data?.actionType === "activate") {
            this.activate();
        } else if (data?.actionType === "deactivate") {
            this.deactivate();
        }
    }
};

this.activate = function () {
    if (this.isActive) return;
    this.isActive = true;
    this.progress = 0;
    this.direction = 1;

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "platform.activated", { uuid: this.target.uuid });
};

this.deactivate = function () {
    this.isActive = false;
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "platform.deactivated", { uuid: this.target.uuid });
};

// -------------------------------------------------------------------
// Update — tween interpolation + player detection
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target || !this.game || !this.isActive) return;

    const speed = this.attributes.speed || 3;
    const loopMode = this.attributes.loopMode || "Loop";
    const pauseAtEnds = this.attributes.pauseAtEnds || 0;

    // Pause at waypoint ends
    if (this.isPaused) {
        this.pauseTimer -= deltaTime;
        if (this.pauseTimer <= 0) {
            this.isPaused = false;
        }
        return;
    }

    // Advance progress
    // Speed is units-per-second; normalize by distance
    const totalDistance = this.startPos.distanceTo(this.endPos);
    if (totalDistance < 0.001) return;

    const step = (speed / totalDistance) * deltaTime;
    this.progress += step * this.direction;

    // Handle end-of-travel
    if (this.progress >= 1) {
        this.progress = 1;
        this.handleEndOfTravel(loopMode, pauseAtEnds);
    } else if (this.progress <= 0) {
        this.progress = 0;
        this.handleEndOfTravel(loopMode, pauseAtEnds);
    }

    // Easing
    const easedProgress = this.applyEasing(this.progress);

    // Interpolate position
    this.currentPos.lerpVectors(this.startPos, this.endPos, easedProgress);

    // Calculate platform velocity (for carrying the player)
    this._platformVelocity.copy(this.currentPos).sub(this.lastPos);

    // Apply position via physics
    this.target.position.copy(this.currentPos);
    this.game.physics.setOrigin(this.target.uuid, this.currentPos);

    this.lastPos.copy(this.currentPos);

    // Player standing detection + speed adjustment (same as platform pack)
    this.updatePlayerDetection();

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "platform.moving", {
        uuid: this.target.uuid,
        progress: this.progress
    });
};

this.handleEndOfTravel = function (loopMode, pauseAtEnds) {
    switch (loopMode) {
        case "Loop":
            // Ping-pong
            this.direction *= -1;
            if (pauseAtEnds > 0) {
                this.isPaused = true;
                this.pauseTimer = pauseAtEnds;
            }
            break;
        case "Repeat":
            // Snap back to start
            this.progress = 0;
            this.direction = 1;
            if (pauseAtEnds > 0) {
                this.isPaused = true;
                this.pauseTimer = pauseAtEnds;
            }
            break;
        case "Play Once":
            this.isActive = false;
            this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "platform.deactivated", { uuid: this.target.uuid });
            break;
    }
};

// -------------------------------------------------------------------
// Player detection — carries player with the platform
// -------------------------------------------------------------------

this.updatePlayerDetection = function () {
    const player = this.game.player;
    if (!player) return;

    // Simple check: player is above the platform within a small range
    const playerPos = player.position;
    const platPos = this.target.position;
    const horizontalDist = Math.sqrt(
        Math.pow(playerPos.x - platPos.x, 2) +
        Math.pow(playerPos.z - platPos.z, 2)
    );

    // Get platform bounding size (rough)
    const bbox = new THREE.Box3().setFromObject(this.target);
    const platRadius = Math.max(bbox.max.x - bbox.min.x, bbox.max.z - bbox.min.z) * 0.6;
    const isAbove = playerPos.y > platPos.y && playerPos.y < platPos.y + 3;

    const wasOnPlatform = this.playerOnPlatform;
    this.playerOnPlatform = horizontalDist < platRadius && isAbove;

    // Apply platform velocity to player (same as platform pack's speed adjustment)
    if (this.playerOnPlatform) {
        this.game.physics.setPlayerSpeedAdjustment(
            player.uuid,
            this._platformVelocity.clone().divideScalar(1 / 60) // convert to per-frame
        );
    } else if (wasOnPlatform && !this.playerOnPlatform) {
        // Stopped riding — clear speed adjustment
        this.game.physics.setPlayerSpeedAdjustment(
            player.uuid,
            new THREE.Vector3(0, 0, 0)
        );
    }
};

// -------------------------------------------------------------------
// Easing — mirrors the tween pack's easing options
// -------------------------------------------------------------------

this.applyEasing = function (t) {
    const easing = this.attributes.easing || "sineInOut";
    switch (easing) {
        case "linear":       return t;
        case "quadIn":       return t * t;
        case "quadOut":      return t * (2 - t);
        case "quadInOut":    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        case "cubicIn":      return t * t * t;
        case "cubicOut":     { const t1 = t - 1; return t1 * t1 * t1 + 1; }
        case "cubicInOut":   return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        case "sineIn":       return 1 - Math.cos(t * Math.PI / 2);
        case "sineOut":      return Math.sin(t * Math.PI / 2);
        case "sineInOut":    return -(Math.cos(Math.PI * t) - 1) / 2;
        case "bounceOut":    return this.bounceOut(t);
        case "bounceIn":     return 1 - this.bounceOut(1 - t);
        default:             return t;
    }
};

this.bounceOut = function (t) {
    if (t < 1 / 2.75) return 7.5625 * t * t;
    if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
    if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
    t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375;
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.progress = 0;
    this.direction = 1;
    this.isActive = !this.attributes.startOnTrigger;
    this.target.position.copy(this.startPos);
    this.game.physics.setOrigin(this.target.uuid, this.startPos);
};

this.onAttributesUpdated = function () {
    // Recalculate end position if move attribute changed
    const move = this.attributes.move || { x: 0, y: 5, z: 0 };
    const displacement = new THREE.Vector3(move.x, move.y, move.z);
    displacement.applyQuaternion(this.target.quaternion);
    this.endPos.copy(this.startPos).add(displacement);
};

this.dispose = function () {
    this.waypoints = null;
};
