/**
 * COLLECTIBLE BEHAVIOR EXAMPLE
 *
 * Pickup item that detects player proximity, handles collection, and
 * optionally respawns. Mirrors the patterns used by the built-in
 * `consumable` pack behavior:
 *   - CollisionDetector with COLLISION_TYPE.WITH_PLAYER
 *   - Attribute-driven rewards (score, health, speed boost)
 *   - Behavior event notifications (consumable.collected, game.score.inc, etc.)
 *   - Range detection with visual feedback
 *   - Respawn timer
 *   - erth.lambdas for reading/writing component data
 *
 * behavior.json attributes:
 *   scoreAmount: 10, healthAmount: 0, speedBoostAmount: 0,
 *   speedBoostDuration: 3, collectionRadius: 2.5, canRespawn: false,
 *   respawnDelay: 5, bobHeight: 0.3, spinSpeed: 2
 */

this.init = function (game) {
    this.game = game;

    this.isCollected = false;
    this.collisionListenerId = null;
    this.respawnTimer = 0;
    this.bobOffset = 0;
    this.originalY = 0;
};

this.onStart = function () {
    if (!this.target || !this.game) return;

    this.originalY = this.target.position.y;

    // Register distance-based collision with player (same as consumable pack)
    this.collisionListenerId = this.game.collisionDetector.addListener(
        this.target,
        {
            type: COLLISION_TYPE.WITH_PLAYER,
            distanceThreshold: this.attributes.collectionRadius || 2.5,
            callback: () => this.onPlayerInRange()
        },
        false // distance-based
    );
};

// -------------------------------------------------------------------
// Update — bob animation + respawn timer
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target) return;

    if (this.isCollected) {
        // Respawn countdown
        if (this.attributes.canRespawn) {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                this.respawn();
            }
        }
        return;
    }

    // Idle bob animation (same visual feedback pattern as consumable)
    const bobHeight = this.attributes.bobHeight || 0.3;
    const spinSpeed = this.attributes.spinSpeed || 2;

    this.bobOffset += deltaTime * 2;
    this.target.position.y = this.originalY + Math.sin(this.bobOffset) * bobHeight;

    // Spin
    const yAxis = new THREE.Vector3(0, 1, 0);
    const spinQuat = new THREE.Quaternion().setFromAxisAngle(yAxis, spinSpeed * deltaTime);
    this.target.quaternion.multiply(spinQuat);
};

// -------------------------------------------------------------------
// Collection — triggered by collision detector
// -------------------------------------------------------------------

this.onPlayerInRange = function () {
    if (this.isCollected) return;
    this.collect();
};

this.collect = function () {
    this.isCollected = true;

    // Apply rewards
    const scoreAmount = this.attributes.scoreAmount || 0;
    const healthAmount = this.attributes.healthAmount || 0;
    const speedBoostAmount = this.attributes.speedBoostAmount || 0;

    const player = this.game.player;

    if (scoreAmount > 0) {
        this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "game.score.inc", { amount: scoreAmount });
    }

    if (healthAmount > 0) {
        if (player) {
            this.game.behaviorManager.sendEventToObjectBehaviors(player, "game.health.inc", { amount: healthAmount });
        }

        // If player has a health lambda, write to it via erth.lambdas
        this.updateHealthLambda(healthAmount);
    }

    if (speedBoostAmount > 0 && player) {
        this.game.behaviorManager.sendEventToObjectBehaviors(player, "player.speed_boost", {
            amount: speedBoostAmount,
            duration: this.attributes.speedBoostDuration || 3
        });
    }

    // Notify other behaviors (visualEffect listens for this)
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "consumable.collected", {
        uuid: this.target.uuid,
        scoreAmount,
        healthAmount
    });

    // Hide the object
    this.target.visible = false;

    // Setup respawn
    if (this.attributes.canRespawn) {
        this.respawnTimer = this.attributes.respawnDelay || 5;
    }
};

// -------------------------------------------------------------------
// Lambda integration — write health data to player's health lambda
// -------------------------------------------------------------------

this.updateHealthLambda = function (healAmount) {
    const player = this.game.player;
    if (!player) return;

    // Use erth.lambdas to find health component on player
    const playerLambdas = this.erth.lambdas.getObjectLambdas(player);
    const healthLambda = playerLambdas.find(l => l.id === "health");
    if (!healthLambda) return;

    const data = healthLambda.getComponentData(player);
    if (!data) return;

    const newHealth = Math.min((data.current || 0) + healAmount, data.max || 100);
    this.game.lambdaManager.setObjectComponentData(
        healthLambda.uuid, player, "current", newHealth
    );
};

// -------------------------------------------------------------------
// Respawn
// -------------------------------------------------------------------

this.respawn = function () {
    this.isCollected = false;
    this.target.visible = true;
    this.target.position.y = this.originalY;
    this.bobOffset = 0;
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.isCollected = false;
    this.target.visible = true;
    this.target.position.y = this.originalY;
    this.bobOffset = 0;
    this.respawnTimer = 0;
};

this.dispose = function () {
    if (this.collisionListenerId && this.game?.collisionDetector) {
        this.game.collisionDetector.deleteListener(this.target, this.collisionListenerId);
    }
};
