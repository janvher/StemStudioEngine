/**
 * PHYSICS SYSTEM EXAMPLE
 * 
 * Demonstrates correct usage of IPhysics interface.
 * Shows forces, impulses, velocity, and position/rotation control.
 */

this.init = function(game) {
    this.game = game;
    this.jumpForce = 500;
    this.launchForce = 1000;
    
    // Input state
    this.keys = {};
    
    // Bind event handlers
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
};

this.onStart = function() {
    // Initialize physics state
    this.isGrounded = true;
    
    // Setup event listeners
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
};

// Handle keyboard input
this.handleKeyDown = function(event) {
    this.keys[event.code] = true;
};

this.handleKeyUp = function(event) {
    this.keys[event.code] = false;
};

// Example 1: Apply central impulse (instant force)
this.jump = function() {
    const jumpImpulse = new THREE.Vector3(0, this.jumpForce, 0);
    this.game.physics.applyCentralImpulse(this.target.uuid, jumpImpulse);
    this.isGrounded = false;
};

// Example 2: Apply impulse at specific point (for rotation)
this.applyTorque = function() {
    const impulse = new THREE.Vector3(100, 0, 0);
    const relativePosition = new THREE.Vector3(0, 1, 0); // Apply above center
    this.game.physics.applyImpulseToRigidBody(
        this.target.uuid,
        impulse,
        relativePosition
    );
};

// Example 3: Set velocity directly
this.launch = function(direction) {
    const velocity = direction.clone().multiplyScalar(this.launchForce);
    this.game.physics.setLinearVelocity(this.target.uuid, velocity);
};

// Example 4: Teleport (set position)
this.teleport = function(targetPosition) {
    this.game.physics.setOrigin(this.target.uuid, targetPosition);
};

// Example 5: Rotate object
this.rotate = function(angle) {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this.game.physics.setRotation(this.target.uuid, quaternion);
};

// Example 6: Character controller movement (for player)
this.update = function(deltaTime) {
    if (!this.target) return;
    
    // Get input state
    const forward = (this.keys['KeyW'] ? 1 : 0) + (this.keys['KeyS'] ? -1 : 0);
    const lateral = (this.keys['KeyD'] ? 1 : 0) + (this.keys['KeyA'] ? -1 : 0);
    const jump = this.keys['Space'];
    
    const walkDirection = new THREE.Vector3(lateral, 0, -forward);
    if (walkDirection.length() > 0) {
        walkDirection.normalize();
    }
    
    // Use character controller for player movement
    this.game.physics.movePlayerObject(
        this.target.uuid,
        walkDirection,
        jump && this.isGrounded
    );
    
    // Example: Jump with Space
    if (jump && this.isGrounded && !this.wasJumping) {
        this.jump();
    }
    this.wasJumping = jump;
};

// Example 7: Set player spawn position
this.respawn = function() {
    const spawnPosition = new THREE.Vector3(0, 5, 0);
    this.game.physics.setPlayerPosition(this.target.uuid, spawnPosition);
};

// Example 8: Enable collision detection
this.enableCollisions = function() {
    const registration = {
        id: "collision_listener_1",
        type: COLLISION_TYPE.WITH_PLAYER
    };
    this.game.physics.detectCollisionsForObject(
        this.target.uuid,
        registration,
        true // enable
    );
};

// Example 9: Make object a ghost (no physics response, only callbacks)
this.makeGhost = function() {
    this.game.physics.setCollisionBehavior(
        this.target.uuid,
        CollisionBehavior.Ghost
    );
};

// Example 10: Projectile launcher
this.fireProjectile = function() {
    // Get forward direction
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.target.quaternion);
    direction.multiplyScalar(2000);
    
    // Apply impulse to projectile
    this.game.physics.applyCentralImpulse(this.projectile.uuid, direction);
};

// Cleanup
this.dispose = function() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
};

// ❌ WRONG - THESE METHODS DO NOT EXIST:
// this.game.physics.applyForce()           // Use applyCentralImpulse()
// this.game.physics.setPosition()          // Use setOrigin()
// this.game.physics.setVelocity()          // Use setLinearVelocity()
// this.game.physics.addForce()             // Use applyCentralImpulse()
