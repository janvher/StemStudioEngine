# Game Design Patterns

Load when: planning custom gameplay systems for a new game or when built-in behaviors are not enough.

Use this doc for common gameplay architectures: state machines, wave spawners, progression managers, AI loops, and timer/cooldown systems.

Cross-reference:
- [behavior-system.md](behavior-system.md) for lifecycle, `erth`, and closure-pattern rules
- [performance-patterns.md](performance-patterns.md) for hot-path allocation and pooling
- [camera-guide.md](camera-guide.md) when camera behavior is part of the mechanic

## State Machine Pattern

StemStudio has no built-in generic state machine. Model it explicitly in behavior code:

```javascript
this.states = {
  IDLE: "idle",
  CHASE: "chase",
  ATTACK: "attack",
  DEAD: "dead",
};

this.currentState = this.states.IDLE;
this.stateTimer = 0;

this.update = function(deltaTime) {
  this.stateTimer += deltaTime;

  switch (this.currentState) {
    case this.states.IDLE:
      this.handleIdle(deltaTime);
      break;
    case this.states.CHASE:
      this.handleChase(deltaTime);
      break;
    case this.states.ATTACK:
      this.handleAttack(deltaTime);
      break;
    case this.states.DEAD:
      break;
  }
};
```

Transition helper:

```javascript
this.transitionTo = function(newState) {
  if (this.currentState === this.states.DEAD) return;
  this.currentState = newState;
  this.stateTimer = 0;
};
```

Expose the initial state and major thresholds as configurable attributes instead of hardcoding them.

## Spawn / Wave Management

Wave definitions fit well as behavior attributes or lambda data:

```javascript
this.waves = JSON.parse(this.getAttribute("waves") || "[]");
this.currentWave = 0;
this.spawnTimer = 0;
this.waveTimer = 0;
this.spawned = 0;
this.activeEnemies = [];
```

Recommended pattern:
- Track active enemies explicitly in an array or map
- Advance the wave only when spawn quota is met and all spawned enemies are gone
- Mirror user-visible values into `erth.store` so UI/HUD behaviors can read them

```javascript
this.erth.store.set("currentWave", this.currentWave);
this.erth.store.set("enemiesRemaining", this.activeEnemies.length);
```

Use `erth.pool.create(...)` when enemies, projectiles, or effects are spawned frequently.

## Progression / Level Systems

Centralize progression in a game-manager behavior or lambda instead of spreading it across pickups, enemies, and UI.

```javascript
if (allObjectivesComplete) {
  this.erth.store.set("level", currentLevel + 1);
  this.erth.store.set("gameState", "levelComplete");
}

this.erth.store.set("score", (this.erth.store.get("score") || 0) + points);
```

Good shared keys:
- `gameState`
- `level`
- `score`
- `currentWave`
- `bossActive`
- `objectiveCount`

## Health / Damage Pattern

Use `erth.combat` and `erth.team` instead of inventing your own damage matrix when the game fits the built-in model.

```javascript
const defenderStats = {
  health: 100,
  maxHealth: 100,
  attackDamageMin: 10,
  attackDamageMax: 15,
  damageType: "normal",
  armor: 5,
  armorType: "medium",
};

const result = this.erth.combat.calculateDamage(attackerStats, defenderStats);
const killed = this.erth.combat.applyDamage(defenderStats, result);

this.erth.store.set("playerHealth", defenderStats.health);
this.erth.store.set("playerMaxHealth", defenderStats.maxHealth);
```

Use a dedicated manager behavior to decide:
- who can damage whom
- when death triggers progression
- how UI and VFX react to damage

## AI Patterns

### Patrol

Waypoints work well as JSON array attributes:

```javascript
this.waypoints = JSON.parse(this.getAttribute("waypoints") || "[]");
this.patrolSpeed = this.getAttribute("patrolSpeed") || 3;
this.waypointIndex = 0;
this._moveDir = new THREE.Vector3();

this.update = function(deltaTime) {
  if (this.waypoints.length === 0) return;

  const wp = this.waypoints[this.waypointIndex];
  this._moveDir.set(
    wp.x - this.target.position.x,
    0,
    wp.z - this.target.position.z
  );

  if (this._moveDir.length() < 0.5) {
    this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    return;
  }

  this._moveDir.normalize().multiplyScalar(this.patrolSpeed * deltaTime);
  this.target.position.add(this._moveDir);
};
```

### Chase / Flee

Use `erth.team.findNearestEnemy()` or `erth.team.getEnemiesInRange()` to choose targets. Make chase/flee thresholds configurable:
- `chaseRange`
- `chaseSpeed`
- `fleeSpeed`
- `fleeHealthThreshold`

### Combat AI

Combine state machine + team targeting + combat API:

```javascript
const bestTarget = this.erth.combat.selectBestTarget(this.target.position, enemies);

switch (this.currentState) {
  case this.states.IDLE:
    if (bestTarget) this.transitionTo(this.states.CHASE);
    break;
  case this.states.CHASE:
    if (!bestTarget) {
      this.transitionTo(this.states.IDLE);
      break;
    }

    if (this.target.position.distanceTo(bestTarget.position) <= this.attackRange) {
      this.transitionTo(this.states.ATTACK);
      break;
    }

    this._moveDir.subVectors(bestTarget.position, this.target.position).normalize();
    this.target.position.addScaledVector(this._moveDir, this.chaseSpeed * deltaTime);
    break;
}
```

## Input Pattern

Prefer `game.inputManager` for standard movement/actions instead of raw DOM listeners.

```javascript
let game;
let inputManager;

this.init = function(_game) {
  game = _game;
  inputManager = game.inputManager;
};

this.update = function(deltaTime) {
  const moveX = inputManager ? inputManager.getMotion("lateral") : 0;
  const moveZ = inputManager ? inputManager.getMotion("forward") : 0;
  const jumpHeld = inputManager ? inputManager.getAction("jump") : false;

  // feed these values into your movement/controller logic
};
```

Use the built-in `touchControls` behavior when the game should also be playable on mobile.

## Timer and Cooldown Pattern

Keep cooldowns as plain numbers and decrement them every update:

```javascript
this.attackCooldown = 0;
this.attackRate = this.getAttribute("attackRate") || 1.0;

this.update = function(deltaTime) {
  this.attackCooldown = Math.max(0, this.attackCooldown - deltaTime);

  if (this.attackCooldown <= 0 && shouldAttack) {
    this.performAttack();
    this.attackCooldown = 1 / this.attackRate;
  }
};
```

This pattern is easier to debug than timers spread across multiple callbacks.

## Configurable Parameter Guidelines

| System | Parameters to Expose |
|--------|----------------------|
| State machine | `initialState` |
| Wave spawner | `waves`, `timeBetweenWaves`, `spawnRadius` |
| Progression | `winCondition`, `scoreMultiplier`, `startingLevel` |
| Patrol AI | `waypoints`, `patrolSpeed`, `patrolMode` |
| Chase AI | `chaseRange`, `chaseSpeed`, `fleeSpeed`, `fleeHealthThreshold` |
| Combat AI | `attackRange`, `attackRate`, `aggroRange` |
| Cooldowns | `cooldownDuration`, `rate` |

Rules of thumb:
- Expose values the user will likely tune
- Keep defaults aligned with the intended game feel
- Do not expose every internal variable just because you can
