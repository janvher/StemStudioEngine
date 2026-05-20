/**
 * LAMBDA EXAMPLE — Health System with Shield & Regeneration
 *
 * Shows how a behavior reads/writes lambda (ECS) component data for a
 * health system. The lambda stores the data; this behavior provides logic.
 *
 * Prerequisites:
 *   Attach a "health" lambda to the target object via the editor Lambda panel:
 *     id: "health"
 *     attributes: { current: 100, max: 100, regenRate: 2, shield: 0, shieldMax: 50 }
 *
 * Access patterns used:
 *   - this.erth.lambdas.getObjectLambdas(target) — find lambdas on an object
 *   - lambda.getComponentData(target)             — read data for a specific object
 *   - game.lambdaManager.setObjectComponentData() — write data
 *   - this.erth.lambdas.getInstancesByType(id)    — find all instances scene-wide
 *
 * behavior.json attributes:
 *   invulnerabilityTime: 0.5, flashOnDamage: true, deathDelay: 2
 */

this.init = function (game) {
    this.game = game;

    this.lastHealth = null;
    this.regenAccumulator = 0;
    this.invulnTimer = 0;
    this.isDead = false;
};

this.onStart = function () {
    if (!this.target) return;

    // Read initial state from lambda
    const data = this.readHealthData();
    if (!data) {
        console.warn("[HealthSystem] No 'health' lambda on this object. Attach one in the editor.");
        return;
    }

    this.lastHealth = data.current;
    console.log(`[HealthSystem] HP: ${data.current}/${data.max}, Shield: ${data.shield}/${data.shieldMax}`);
};

// -------------------------------------------------------------------
// Update — regeneration, damage flash, death check
// -------------------------------------------------------------------

this.update = function (deltaTime) {
    if (!this.target || this.isDead) return;

    this.invulnTimer = Math.max(0, this.invulnTimer - deltaTime);

    const lambda = this.getHealthLambda();
    if (!lambda) return;

    const data = lambda.getComponentData(this.target);
    if (!data) return;

    // 1. Passive HP regeneration
    if (data.regenRate > 0 && data.current < data.max && data.current > 0) {
        this.regenAccumulator += data.regenRate * deltaTime;
        if (this.regenAccumulator >= 1) {
            const heal = Math.floor(this.regenAccumulator);
            this.regenAccumulator -= heal;
            this.writeHealth(lambda, Math.min(data.current + heal, data.max));
        }
    }

    // 2. Detect external changes (another behavior wrote to the lambda)
    const current = data.current;
    if (current !== this.lastHealth) {
        const delta = current - this.lastHealth;
        if (delta < 0) {
            this.onDamaged(Math.abs(delta), current, data.max);
        } else if (delta > 0) {
            this.onHealed(delta, current, data.max);
        }
        this.lastHealth = current;
    }

    // 3. Death
    if (current <= 0 && !this.isDead) {
        this.onDeath();
    }
};

// -------------------------------------------------------------------
// onEvent handler — damage and heal from other behaviors
// -------------------------------------------------------------------

this.onEvent = function (msg, eventData) {
    if (this.isDead || !this.target) return;

    const lambda = this.getHealthLambda();
    if (!lambda) return;
    const data = lambda.getComponentData(this.target);
    if (!data) return;

    if (msg === "player.take_damage" || msg === "enemy.take_damage") {
        // Only process if this is the intended target
        if (eventData.uuid && eventData.uuid !== this.target.uuid) return;

        // Invulnerability frame
        const invulnTime = this.attributes.invulnerabilityTime || 0.5;
        if (this.invulnTimer > 0) return;
        this.invulnTimer = invulnTime;

        let damage = eventData.amount || 0;

        // Shield absorbs damage first
        if (data.shield > 0) {
            const absorbed = Math.min(damage, data.shield);
            damage -= absorbed;
            this.writeField(lambda, "shield", data.shield - absorbed);
        }

        // Remaining damage to health
        if (damage > 0) {
            this.writeHealth(lambda, Math.max(0, data.current - damage));
        }
    }

    if (msg === "player.heal") {
        if (eventData.uuid && eventData.uuid !== this.target.uuid) return;
        const heal = eventData.amount || 0;
        this.writeHealth(lambda, Math.min(data.current + heal, data.max));
    }

    if (msg === "player.add_shield") {
        if (eventData.uuid && eventData.uuid !== this.target.uuid) return;
        const amount = eventData.amount || 0;
        this.writeField(lambda, "shield", Math.min(data.shield + amount, data.shieldMax || 50));
    }
};

// -------------------------------------------------------------------
// Callbacks
// -------------------------------------------------------------------

this.onDamaged = function (amount, current, max) {
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "game.health.dec", {
        target: this.target.uuid,
        amount: amount,
        current: current,
        max: max
    });

    // Flash red (visual feedback)
    if (this.attributes.flashOnDamage) {
        this.flashObject(0xff0000, 0.15);
    }
};

this.onHealed = function (amount, current, max) {
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "game.health.inc", {
        target: this.target.uuid,
        amount: amount,
        current: current,
        max: max
    });
};

this.onDeath = function () {
    this.isDead = true;
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "character.action.dead", {
        target: this.target.uuid
    });

    // Play death animation if available
    if (this.game.animationController) {
        this.game.animationController.playAnimation(
            this.target, "die", 1, true, 0.25
        );
    }
};

// -------------------------------------------------------------------
// Visual feedback
// -------------------------------------------------------------------

this.flashObject = function (color, duration) {
    const originalMaterials = [];

    this.target.traverse((child) => {
        if (child.isMesh && child.material) {
            originalMaterials.push({ mesh: child, color: child.material.color.getHex() });
            child.material.color.setHex(color);
        }
    });

    setTimeout(() => {
        originalMaterials.forEach(({ mesh, color: origColor }) => {
            if (mesh.material) {
                mesh.material.color.setHex(origColor);
            }
        });
    }, duration * 1000);
};

// -------------------------------------------------------------------
// Lambda helpers
// -------------------------------------------------------------------

this.getHealthLambda = function () {
    const lambdas = this.erth.lambdas.getObjectLambdas(this.target);
    return lambdas.find(l => l.id === "health") || null;
};

this.readHealthData = function () {
    const lambda = this.getHealthLambda();
    if (!lambda) return null;
    return lambda.getComponentData(this.target);
};

this.writeHealth = function (lambda, value) {
    this.game.lambdaManager.setObjectComponentData(
        lambda.uuid, this.target, "current", value
    );
};

this.writeField = function (lambda, key, value) {
    this.game.lambdaManager.setObjectComponentData(
        lambda.uuid, this.target, key, value
    );
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.isDead = false;
    this.invulnTimer = 0;
    this.regenAccumulator = 0;

    // Reset lambda data to max
    const lambda = this.getHealthLambda();
    if (lambda) {
        const data = lambda.getComponentData(this.target);
        if (data) {
            this.writeHealth(lambda, data.max || 100);
            this.writeField(lambda, "shield", data.shieldMax || 0);
        }
    }
};

this.dispose = function () {
    this.lastHealth = null;
};
