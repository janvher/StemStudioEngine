/**
 * OBJECT PICKER EXAMPLE
 * 
 * Demonstrates mouse click/hover detection with IObjectPicker and PointerEventManager.
 */

this.init = function(game) {
    this.game = game;
    this.hoveredObject = null;
    this.originalColor = null;
    
    // Bind methods
    this.onPointerDown = this.handlePointerDown.bind(this);
    this.onPointerMove = this.handlePointerMove.bind(this);
};

this.onStart = function() {
    // Example 1: Register pointer event handler for click and hover
    this.game.pointerEventManager.registerHandler(
        'object_picker_example',
        {
            onPointerDown: this.onPointerDown,
            onPointerMove: this.onPointerMove
        },
        null,  // Global handler
        10     // Priority
    );
};

// Example 3: Handle click detection
this.handlePointerDown = function(event) {
    // Get clicked object using ObjectPicker
    const clickedObject = this.game.objectPicker.getObjectAtScreenPosition(
        event.clientX,
        event.clientY
    );
    
    if (clickedObject) {
        console.log("Clicked object:", clickedObject.name);
        
        // Trigger interaction
        this.onObjectClicked(clickedObject);
    }
    
    return false; // Not handled exclusively, allow other handlers
};

// Example 4: Handle hover detection with highlighting
this.handlePointerMove = function(event) {
    const hoveredObject = this.game.objectPicker.getObjectAtScreenPosition(
        event.clientX,
        event.clientY
    );
    
    // Reset previous hover state
    if (this.hoveredObject && this.hoveredObject !== hoveredObject) {
        this.resetHighlight(this.hoveredObject);
    }
    
    // Apply new hover state
    if (hoveredObject && hoveredObject !== this.hoveredObject) {
        this.highlightObject(hoveredObject);
    }
    
    this.hoveredObject = hoveredObject;
    
    return false; // Allow other handlers to process move events
};

// Example 5: Highlight hovered object
this.highlightObject = function(object) {
    if (object.material) {
        // Store original color
        this.originalColor = object.material.color.getHex();
        // Apply highlight
        object.material.color.setHex(0xffff00); // Yellow highlight
        object.material.emissive.setHex(0x444400);
    }
};

// Example 6: Reset highlight
this.resetHighlight = function(object) {
    if (object.material && this.originalColor !== null) {
        object.material.color.setHex(this.originalColor);
        object.material.emissive.setHex(0x000000);
        this.originalColor = null;
    }
};

// Example 7: Raycast from custom position
this.raycastFromPosition = function(screenX, screenY) {
    const intersected = this.game.objectPicker.getObjectAtScreenPosition(screenX, screenY);
    return intersected;
};

// Example 8: Get all objects under cursor (with multiple intersections)
this.getAllObjectsUnderCursor = function(event) {
    // Note: getObjectAtScreenPosition returns first object
    // For multiple objects, you need to use Three.js Raycaster directly
    const raycaster = this.game.objectPicker.raycaster;
    const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    raycaster.setFromCamera(mouse, this.game.camera);
    const intersects = raycaster.intersectObjects(this.game.scene.children, true);
    
    return intersects.map(i => i.object);
};

// Example 9: Interactive button behavior
this.createInteractiveButton = function(buttonObject) {
    buttonObject.isInteractive = true;
    
    // Register separate handler for button
    this.game.pointerEventManager.registerHandler(
        'button_handler',
        {
            onPointerDown: (event) => {
                const clicked = this.game.objectPicker.getObjectAtScreenPosition(
                    event.clientX,
                    event.clientY
                );
                
                if (clicked && clicked.id === buttonObject.id) {
                    console.log("Button clicked!");
                    this.onButtonActivate();
                    return true; // Event handled
                }
                return false;
            }
        },
        null,
        5  // Higher priority than default
    );
};

// Example 10: Drag-and-drop detection
this.setupDragDrop = function() {
    let isDragging = false;
    let draggedObject = null;
    
    this.game.pointerEventManager.registerHandler(
        'drag_drop_handler',
        {
            onPointerDown: (event) => {
                draggedObject = this.game.objectPicker.getObjectAtScreenPosition(
                    event.clientX,
                    event.clientY
                );
                if (draggedObject && draggedObject.isDraggable) {
                    isDragging = true;
                    return true; // Capture this pointer
                }
                return false;
            },
            
            onPointerMove: (event) => {
                if (isDragging && draggedObject) {
                    const worldPos = this.screenToWorld(event.clientX, event.clientY);
                    draggedObject.position.copy(worldPos);
                    return true;
                }
                return false;
            },
            
            onPointerUp: (event) => {
                if (isDragging) {
                    isDragging = false;
                    draggedObject = null;
                    return true;
                }
                return false;
            }
        },
        null,
        1  // High priority to capture drag events
    );
};

// Helper: Convert screen coordinates to world position
this.screenToWorld = function(screenX, screenY) {
    const mouse = new THREE.Vector2(
        (screenX / window.innerWidth) * 2 - 1,
        -(screenY / window.innerHeight) * 2 + 1
    );
    
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.game.camera);
    
    // Raycast to ground plane (y=0)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    
    return intersection;
};

// Cleanup
this.dispose = function() {
    // Unregister pointer event handler
    this.game.pointerEventManager.unregisterHandler('object_picker_example');
    
    // Unregister other handlers if created
    if (this.game.pointerEventManager.getHandlerById) {
        this.game.pointerEventManager.unregisterHandler('button_handler');
        this.game.pointerEventManager.unregisterHandler('drag_drop_handler');
    }
};

/**
 * ❌ WRONG - These methods DO NOT exist:
 * 
 * this.game.pointerEventManager.addListener(eventType, callback)
 * this.game.pointerEventManager.removeListener(eventType)
 * this.game.objectPicker.pickObject(x, y)
 * this.game.objectPicker.raycast(origin, direction)
 * 
 * ✅ CORRECT:
 * this.game.pointerEventManager.registerHandler(id, handler, element, priority)
 * this.game.pointerEventManager.unregisterHandler(id)
 * this.game.objectPicker.getObjectAtScreenPosition(x, y)
 * 
 * Handler interface:
 * {
 *   onPointerDown?: (event: PointerEvent) => boolean,
 *   onPointerMove?: (event: PointerEvent) => boolean,
 *   onPointerUp?: (event: PointerEvent) => boolean
 * }
 * Return true if event was handled, false to allow other handlers
 */
