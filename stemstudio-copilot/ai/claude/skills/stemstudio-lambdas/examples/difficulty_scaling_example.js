/**
 * LAMBDA EXAMPLE — Difficulty Scaling System
 *
 * Shows how a scene-wide "wave manager" behavior reads/writes lambda data
 * on multiple objects to scale enemy difficulty each wave. The lambda
 * stores per-enemy difficulty data; this behavior modifies it.
 *
 * Prerequisites:
 *   Attach a "difficulty" lambda to each enemy object:
 *     id: "difficulty"
 *     attributes: { tier: 1, healthMultiplier: 1.0, speedMultiplier: 1.0,
 *                   damageMultiplier: 1.0, xpReward: 10 }
 *
 * Lambda access patterns demonstrated:
 *   - getInstancesByType() — find all difficulty lambdas in scene
 *   - registeredObjects — iterate all objects with this lambda
 *   - getComponentData() — read per-object data
 *   - setObjectComponentData() — write per-object data
 *   - erth.store — track wave number in global store
 *
 * behavior.json attributes:
 *   baseWaveDelay: 10, healthScalePerTier: 1.5, speedScalePerTier: 1.2,
 *   damageScalePerTier: 1.3, xpScalePerTier: 1.4
 */

this.init = function (game) {
    this.game = game;

    this.waveActive = false;
    this.waveTimer = 0;
    this.enemiesRemaining = 0;
};

this.onStart = function () {
    if (!this.target) return;

    // Use erth.store for cross-behavior wave tracking
    this.erth.store.set("currentWave", 0);
    this.erth.store.set("totalKills", 0);

    console.log("[DifficultyScaling] Ready — waiting for first wave trigger");
};

// -------------------------------------------------------------------
// onEvent — wave triggers, enemy death tracking
// -------------------------------------------------------------------

this.onEvent = function (msg, data) {
    if (msg === "wave.start") {
        this.startNextWave();
    }

    if (msg === "enemy.died") {
        this.enemiesRemaining--;
        const totalKills = (this.erth.store.get("totalKills") || 0) + 1;
        this.erth.store.set("totalKills", totalKills);

        // Award XP based on the dead enemy's difficulty tier
        if (data?.uuid) {
            this.awardXpForEnemy(data.uuid);
        }

        // Wave cleared?
        if (this.enemiesRemaining <= 0 && this.waveActive) {
            this.waveActive = false;
            this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "wave.cleared", {
                wave: this.erth.store.get("currentWave")
            });

            // Auto-start next wave after delay
            this.waveTimer = this.attributes.baseWaveDelay || 10;
        }
    }
};

this.update = function (deltaTime) {
    if (!this.waveActive && this.waveTimer > 0) {
        this.waveTimer -= deltaTime;
        if (this.waveTimer <= 0) {
            this.startNextWave();
        }
    }
};

// -------------------------------------------------------------------
// Wave start — scale all enemies with difficulty lambda
// -------------------------------------------------------------------

this.startNextWave = function () {
    const wave = (this.erth.store.get("currentWave") || 0) + 1;
    this.erth.store.set("currentWave", wave);

    // Find ALL difficulty lambda instances across the scene
    const difficultyInstances = this.erth.lambdas.getInstancesByType("difficulty");

    this.enemiesRemaining = 0;

    for (const lambda of difficultyInstances) {
        // Each lambda instance tracks which objects it's registered to
        for (const [enemyObject] of lambda.registeredObjects) {
            // Skip invisible/dead enemies
            if (!enemyObject.visible) continue;

            const data = lambda.getComponentData(enemyObject);
            if (!data) continue;

            // Calculate tier for this wave
            const tier = wave;

            const healthScale = this.attributes.healthScalePerTier || 1.5;
            const speedScale = this.attributes.speedScalePerTier || 1.2;
            const damageScale = this.attributes.damageScalePerTier || 1.3;
            const xpScale = this.attributes.xpScalePerTier || 1.4;

            // Write scaled values to the lambda
            this.game.lambdaManager.setObjectComponentData(
                lambda.uuid, enemyObject, "tier", tier
            );
            this.game.lambdaManager.setObjectComponentData(
                lambda.uuid, enemyObject, "healthMultiplier", Math.pow(healthScale, tier - 1)
            );
            this.game.lambdaManager.setObjectComponentData(
                lambda.uuid, enemyObject, "speedMultiplier", Math.pow(speedScale, tier - 1)
            );
            this.game.lambdaManager.setObjectComponentData(
                lambda.uuid, enemyObject, "damageMultiplier", Math.pow(damageScale, tier - 1)
            );
            this.game.lambdaManager.setObjectComponentData(
                lambda.uuid, enemyObject, "xpReward", Math.round(10 * Math.pow(xpScale, tier - 1))
            );

            this.enemiesRemaining++;

            console.log(
                `[DifficultyScaling] ${enemyObject.name} — tier ${tier}, ` +
                `HP x${Math.pow(healthScale, tier - 1).toFixed(1)}, ` +
                `DMG x${Math.pow(damageScale, tier - 1).toFixed(1)}`
            );
        }
    }

    this.waveActive = true;

    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "wave.started", {
        wave: wave,
        enemyCount: this.enemiesRemaining
    });

    console.log(`[DifficultyScaling] Wave ${wave} — ${this.enemiesRemaining} enemies`);
};

// -------------------------------------------------------------------
// XP award — read difficulty lambda on dead enemy
// -------------------------------------------------------------------

this.awardXpForEnemy = function (enemyUuid) {
    const enemyObj = this.game.scene.getObjectByProperty("uuid", enemyUuid);
    if (!enemyObj) return;

    const enemyLambdas = this.erth.lambdas.getObjectLambdas(enemyObj);
    const diffLambda = enemyLambdas.find(l => l.id === "difficulty");
    if (!diffLambda) return;

    const data = diffLambda.getComponentData(enemyObj);
    if (!data) return;

    const xp = data.xpReward || 10;
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "game.score.inc", { amount: xp });

    console.log(`[DifficultyScaling] +${xp} XP for killing tier-${data.tier} enemy`);
};

// -------------------------------------------------------------------
// Lifecycle
// -------------------------------------------------------------------

this.onReset = function () {
    this.erth.store.set("currentWave", 0);
    this.erth.store.set("totalKills", 0);
    this.waveActive = false;
    this.waveTimer = 0;
    this.enemiesRemaining = 0;
};

this.dispose = function () {};
