/**
 * ANIMATION CONTROLLER EXAMPLE
 * 
 * Demonstrates correct usage of AnimationController.
 * Shows single animations, blending, and state management.
 */

this.init = function(game) {
    this.game = game;
    this.currentSpeed = 0;
    
    // Input state
    this.keys = {};
    
    // Bind event handlers
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
};

this.onStart = function() {
    // Setup event listeners
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    
    // Start with idle animation
    this.playIdle();
};

// Handle keyboard input
this.handleKeyDown = function(event) {
    this.keys[event.code] = true;
};

this.handleKeyUp = function(event) {
    this.keys[event.code] = false;
};

// Example 1: Play single animation (looping)
this.playIdle = function() {
    this.game.animationController.playAnimation(
        this.target,
        "Idle",
        1.0,      // speed (1.0 = normal)
        false     // playOnce (false = loop)
    );
};

// Example 2: Play animation once with callback
this.playDeath = function() {
    this.game.animationController.playAnimation(
        this.target,
        "Death",
        1.0,
        true,     // playOnce
        0.5,      // fadeDuration (seconds)
        () => {
            // Called when animation completes
            this.onDeathComplete();
        }
    );
};

// Example 3: Blend multiple animations
this.playWalkRun = function(speed) {
    const walkWeight = Math.max(0, 1 - speed / 5);
    const runWeight = Math.min(1, speed / 5);
    
    this.game.animationController.playBlendedAnimations(
        this.target,
        [
            { name: "Walk", weight: walkWeight, speed: 1.0, fadeDuration: 0.3 },
            { name: "Run", weight: runWeight, speed: 1.2, fadeDuration: 0.3 }
        ],
        false  // loop
    );
};

// Example 4: Update blend weights dynamically
this.update = function(deltaTime) {
    // Get input state
    const forward = (this.keys['KeyW'] ? 1 : 0) + (this.keys['KeyS'] ? -1 : 0);
    
    // Update speed
    this.currentSpeed = Math.abs(forward) * 10;
    
    // Update animation blend weights based on speed
    if (this.currentSpeed > 0.1) {
        const walkWeight = Math.max(0, 1 - this.currentSpeed / 5);
        const runWeight = Math.min(1, this.currentSpeed / 5);
        
        this.game.animationController.updateBlendedAnimationWeights(
            this.target,
            {
                "Walk": walkWeight,
                "Run": runWeight
            }
        );
    } else {
        // Stop and play idle
        this.game.animationController.stopAnimation(this.target);
        this.playIdle();
    }
};

// Example 5: Stop animation
this.stopMovement = function() {
    this.game.animationController.stopAnimation(this.target);
};

// Example 6: Pause/resume animation
this.pauseAnimation = function() {
    this.game.animationController.setAnimationPaused(this.target, true);
};

this.resumeAnimation = function() {
    this.game.animationController.setAnimationPaused(this.target, false);
};

// Example 7: Query current animation state
this.getCurrentAnimation = function() {
    const params = AnimationController.getCurrentAnimationParams(this.target);
    if (params && params.length > 0) {
        console.log("Current animations:", params);
        // Returns: [{ name, weight, speed, fadeDuration }, ...]
    }
};

// Example 8: Combat animation with blending
this.performAttack = function() {
    this.game.animationController.playAnimation(
        this.target,
        "Attack",
        1.5,      // faster speed
        true,     // play once
        0.2,      // quick fade
        () => {
            // Return to idle after attack
            this.playIdle();
        }
    );
};

// Example 9: Multiple layered animations
this.playUpperBodyAnimation = function() {
    // Play aim animation on upper body, keep walk on lower
    this.game.animationController.playBlendedAnimations(
        this.target,
        [
            { name: "Walk_Lower", weight: 1.0, speed: 1.0 },
            { name: "Aim_Upper", weight: 1.0, speed: 1.0 }
        ],
        false
    );
};

// Example 10: Speed-modified animation
this.playAnimationWithSpeed = function(animName, speedMultiplier) {
    this.game.animationController.playAnimation(
        this.target,
        animName,
        speedMultiplier,
        false
    );
};

// Cleanup
this.dispose = function() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
};

// ❌ WRONG - THESE METHODS DO NOT EXIST:
// this.game.animation.play("Walk")              // Use animationController.playAnimation()
// this.game.animationController.blend()         // Use playBlendedAnimations()
// this.game.animationController.setSpeed()      // Pass speed in playAnimation()
