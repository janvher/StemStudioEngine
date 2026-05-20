/**
 * FPS CONTROLLER EXAMPLE
 * 
 * First-person shooter controller using direct keyboard/mouse events.
 * Demonstrates mouse look, WASD movement, jumping, and sprinting.
 */

this.init = function(game) {
    this.game = game;
    this.moveSpeed = 5.0;
    this.sprintMultiplier = 1.8;
    this.jumpForce = 8.0;
    this.mouseSensitivity = 0.002;
    
    // Camera rotation
    this.pitch = 0;
    this.yaw = 0;
    
    // Movement state
    this.isGrounded = false;
    this.velocity = new THREE.Vector3();
    
    // Input state
    this.keys = {};
    this.mouseButtons = {};
    
    // Bind event handlers
    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
};

this.onStart = function() {
    // Mark this object as player
    this.game.setPlayer(this.target);
    
    // Setup event listeners
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    
    // Request pointer lock for mouse look
    this.game.cameraControl.requestPointerLock();
};

// Handle keyboard input
this.handleKeyDown = function(event) {
    this.keys[event.code] = true;
};

this.handleKeyUp = function(event) {
    this.keys[event.code] = false;
};

// Handle mouse movement
this.handleMouseMove = function(event) {
    if (document.pointerLockElement) {
        this.yaw -= event.movementX * this.mouseSensitivity;
        this.pitch -= event.movementY * this.mouseSensitivity;
        
        // Clamp pitch to prevent camera flipping
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }
};

// Handle mouse buttons
this.handleMouseDown = function(event) {
    this.mouseButtons[event.button] = true;
};

this.handleMouseUp = function(event) {
    this.mouseButtons[event.button] = false;
};

// Main update loop
this.update = function(deltaTime) {
    if (!this.target) return;
    
    // Get input state
    const forward = (this.keys['KeyW'] ? 1 : 0) + (this.keys['KeyS'] ? -1 : 0);
    const lateral = (this.keys['KeyD'] ? 1 : 0) + (this.keys['KeyA'] ? -1 : 0);
    const isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const jump = this.keys['Space'];
    const shoot = this.mouseButtons[0]; // Left mouse button
    
    // Calculate movement speed
    const moveSpeed = isSprinting ? this.moveSpeed * this.sprintMultiplier : this.moveSpeed;
    
    // Get forward and right vectors based on yaw
    const forwardDir = new THREE.Vector3(
        Math.sin(this.yaw),
        0,
        Math.cos(this.yaw)
    );
    const rightDir = new THREE.Vector3(
        Math.cos(this.yaw),
        0,
        -Math.sin(this.yaw)
    );
    
    // Calculate movement vector
    const moveDirection = new THREE.Vector3();
    moveDirection.addScaledVector(forwardDir, forward);
    moveDirection.addScaledVector(rightDir, lateral);
    
    if (moveDirection.length() > 0) {
        moveDirection.normalize();
        moveDirection.multiplyScalar(moveSpeed);
    }
    
    // Apply horizontal movement
    this.velocity.x = moveDirection.x;
    this.velocity.z = moveDirection.z;
    
    // Apply jump
    if (jump && this.isGrounded && !this.wasJumping) {
        this.velocity.y = this.jumpForce;
        this.isGrounded = false;
    }
    this.wasJumping = jump;
    
    // Apply velocity via physics
    this.game.physics.setLinearVelocity(this.target.uuid, this.velocity);
    
    // Update camera rotation
    this.updateCameraRotation();
    
    // Handle shooting
    if (shoot && !this.wasShooting) {
        this.fireWeapon();
    }
    this.wasShooting = shoot;
    
    // Update weapon bob
    if (Math.abs(forward) > 0.1 || Math.abs(lateral) > 0.1) {
        this.updateWeaponBob(deltaTime);
    }
};

// Update camera rotation
this.updateCameraRotation = function() {
    // Apply rotation to camera
    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.game.camera.quaternion.setFromEuler(euler);
    
    // Keep camera at player position (eye height)
    this.game.camera.position.copy(this.target.position);
    this.game.camera.position.y += 1.6;
};

// Fire weapon
this.fireWeapon = function() {
    // Raycast from camera to detect hit
    const origin = this.game.camera.position;
    const direction = this.game.camera.getWorldDirection(new THREE.Vector3());
    
    // Use physics raycast for hit detection (if available)
    const raycaster = new THREE.Raycaster(origin, direction);
    const intersects = raycaster.intersectObjects(this.game.scene.children, true);
    
    if (intersects.length > 0 && intersects[0].object !== this.target) {
        const hit = intersects[0];
        console.log("Hit:", hit.object.name, "at distance:", hit.distance);
        
        // Send damage event to hit object's behaviors
        this.game.behaviorManager.sendEventToObjectBehaviors(hit.object, "object:damage", {
            target: hit.object.uuid,
            amount: 25,
            position: hit.point
        });
    }
    
    // Play shoot animation and sound
    if (this.weaponObject) {
        this.game.animationController.playAnimation(this.weaponObject, "Fire", 1.0, true);
    }
};

// Weapon bob animation while walking
this.updateWeaponBob = function(deltaTime) {
    if (!this.weaponObject) return;
    
    const bobSpeed = 8.0;
    const bobAmount = 0.05;
    const time = Date.now() / 1000;
    
    const bobOffset = Math.sin(time * bobSpeed) * bobAmount;
    this.weaponObject.position.y = 1.4 + bobOffset;
};

// Cleanup
this.dispose = function() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
};
