/**
 * WEAPON SYSTEM EXAMPLE
 * 
 * Custom weapon behavior using direct mouse events.
 * Demonstrates fire rate control, raycast hit detection, and behavior event integration.
 */

this.init = function(game) {
    this.game = game;
    this.fireRate = this.attributes.fireRate || 10; // Rounds per second
    this.damage = this.attributes.damage || 25;
    this.lastFireTime = 0;
    
    // Input state
    this.mouseButtons = {};
    
    // Bind event handlers
    this.onMouseDown = this.handleMouseDown.bind(this);
    this.onMouseUp = this.handleMouseUp.bind(this);
};

this.onStart = function() {
    // Setup event listeners
    document.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
};

// Handle mouse buttons
this.handleMouseDown = function(event) {
    this.mouseButtons[event.button] = true;
};

this.handleMouseUp = function(event) {
    this.mouseButtons[event.button] = false;
};

this.update = function(deltaTime) {
    const currentTime = Date.now() / 1000;
    
    // Check fire input (left mouse button)
    if (this.mouseButtons[0]) {
        if (currentTime - this.lastFireTime > 1 / this.fireRate) {
            this.fire();
            this.lastFireTime = currentTime;
        }
    }
};

this.fire = function() {
    // Muzzle flash VFX
    this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "weapon:fired", { weapon: this.target });

    // Raycast from camera to detect hit
    const origin = this.game.camera.position;
    const direction = this.game.camera.getWorldDirection(new THREE.Vector3());

    // Use raycaster for hit detection
    const raycaster = new THREE.Raycaster(origin, direction);
    const intersects = raycaster.intersectObjects(this.game.scene.children, true);

    if (intersects.length > 0 && intersects[0].object !== this.target) {
        const hit = intersects[0];

        // Apply damage via behavior event
        this.game.behaviorManager.sendEventToObjectBehaviors(hit.object, "object:damage", {
            target: hit.object.uuid,
            amount: this.damage,
            position: hit.point
        });

        // Impact VFX at hit point
        this.game.behaviorManager.sendEventToObjectBehaviors(this.target, "effect:impact", { position: hit.point });
    }

    // Play shoot animation and sound
    this.game.animationController.playAnimation(this.target, "Fire", 1.0, true);

    if (this.attributes.shootSound) {
        this.game.audioController.playAudioClip(this.attributes.shootSound);
    }
};

this.dispose = function() {
    document.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
};
