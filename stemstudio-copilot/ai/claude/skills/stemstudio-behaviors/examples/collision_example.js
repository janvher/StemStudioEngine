/**
 * COLLISION DETECTOR EXAMPLE
 * 
 * Demonstrates distance-based and physics-based collision detection.
 */

this.init = function(game) {
    this.game = game;
    this.collisionIds = [];
};

this.onStart = function() {
    // Example 1: Distance-based collision with player
    const distanceListenerId = this.game.collisionDetector.addListener(
        this.target,
        {
            type: COLLISION_TYPE.WITH_PLAYER,
            distanceThreshold: 3.0,
            callback: () => {
                this.onPlayerNearby();
            }
        },
        false  // usePhysics = false (distance check)
    );
    this.collisionIds.push(distanceListenerId);
    
    // Example 2: Bounding box collision
    const bboxListenerId = this.game.collisionDetector.addListener(
        this.target,
        {
            type: COLLISION_TYPE.WITH_PLAYER,
            useBoundingBoxes: true,
            callback: () => {
                this.onPlayerCollision();
            }
        },
        false
    );
    this.collisionIds.push(bboxListenerId);
    
    // Example 3: Physics-based collision (requires physics body)
    const physicsListenerId = this.game.collisionDetector.addListener(
        this.target,
        {
            type: COLLISION_TYPE.WITH_PLAYER,
            callback: () => {
                this.onPhysicsCollision();
            }
        },
        true  // usePhysics = true (requires physics body)
    );
    this.collisionIds.push(physicsListenerId);
};

this.onPlayerNearby = function() {
    console.log("Player is nearby (within 3.0 units)");
    // Trigger interaction prompt, start dialog, etc.
};

this.onPlayerCollision = function() {
    console.log("Player collided with bounding box");
    // Pickup item, trigger event, etc.
};

this.onPhysicsCollision = function() {
    console.log("Physics collision with player");
    // Deal damage, bounce, etc.
};

// Example 4: Manual collision check
this.checkCollision = function(otherObject) {
    const isColliding = this.game.collisionDetector.isColliding(
        this.target,
        otherObject,
        false,  // useBoundingBoxes
        5.0     // distanceThreshold
    );
    
    if (isColliding) {
        console.log("Objects are colliding!");
    }
};

// Example 5: Trigger zone that activates once
this.onStart = function() {
    this.hasTriggered = false;
    
    this.triggerId = this.game.collisionDetector.addListener(
        this.target,
        {
            type: COLLISION_TYPE.WITH_PLAYER,
            distanceThreshold: 5.0,
            callback: () => {
                if (!this.hasTriggered) {
                    this.hasTriggered = true;
                    this.onFirstTrigger();
                }
            }
        },
        false
    );
};

this.onFirstTrigger = function() {
    console.log("Trigger zone activated!");
    // Spawn enemies, open door, start cutscene, etc.
    
    // Remove listener after first trigger
    this.game.collisionDetector.deleteListener(this.target, this.triggerId);
};

// Cleanup
this.dispose = function() {
    // Remove all collision listeners
    this.collisionIds.forEach(id => {
        this.game.collisionDetector.deleteListener(this.target, id);
    });
    this.collisionIds = [];
};
