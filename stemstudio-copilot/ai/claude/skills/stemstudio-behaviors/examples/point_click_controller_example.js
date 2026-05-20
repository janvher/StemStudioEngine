/**
 * POINT-AND-CLICK CONTROLLER EXAMPLE
 * 
 * Top-down point-and-click movement controller using PointerEventManager.
 * Demonstrates click-to-move, pathfinding, and animation integration.
 */

this.init = function(game) {
    this.game = game;
    this.game.setPlayer(this.target);
    
    this.moveSpeed = 5;
    this.targetPosition = null;
    this.stopDistance = 0.5;
    
    // Bind event handlers
    this.onPointerDown = this.handlePointerDown.bind(this);
};

this.onStart = function() {
    // Register pointer event handler using PointerEventManager
    this.game.pointerEventManager.registerHandler(
        'point_click_controller',
        {
            onPointerDown: this.onPointerDown
        },
        null,  // Global handler
        10     // Priority
    );
};

// Handle pointer down event
this.handlePointerDown = function(event) {
    // Get ground plane intersection
    const rect = event.target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.game.camera);
    
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersection);
    
    if (intersection) {
        this.targetPosition = intersection;
    }
    
    return true; // Event handled
};

this.update = function(deltaTime) {
    if (!this.targetPosition) return;
    
    // Calculate direction to target
    const direction = new THREE.Vector3();
    direction.subVectors(this.targetPosition, this.target.position);
    const distance = direction.length();
    
    // Stop if close enough
    if (distance < this.stopDistance) {
        this.targetPosition = null;
        this.game.animationController.playAnimation(this.target, "Idle", 1.0);
        return;
    }
    
    // Move toward target
    direction.normalize();
    direction.multiplyScalar(this.moveSpeed * deltaTime);
    this.target.position.add(direction);
    
    // Face movement direction
    this.target.lookAt(this.targetPosition);
    
    // Play walk animation
    this.game.animationController.playAnimation(this.target, "Walk", 1.0);
};

this.dispose = function() {
    if (this.game.pointerEventManager) {
        this.game.pointerEventManager.unregisterHandler('point_click_controller');
    }
};
