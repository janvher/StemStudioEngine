export const LAMBDA_SCRIPT_TEMPLATE = `// Lambda Script
// Available: this.registeredObjects, this.attributes, this._game, this.requestAttributeChange(key, value, options?)
// Override lifecycle methods below

this.init = (game) => {
    // Called once when this lambda instance is created
    // 'game' is the GameManager reference (also available as this._game)
};

this.update = (deltaTime) => {
    // processObjects() automatically handles per-object:
    //   - Frustum culling: objects outside camera view are throttled (~20x slower)
    //   - Distance LOD: far objects (>50m) throttle 4x, very far (>100m) throttle 10x
    //   - Frame budget: stops early if frame time exceeded (~12ms)
    //   - Matrix + instanced mesh sync after your callback runs
    //
    // Use 'dt' (not 'deltaTime') for time-based math — it compensates for skipped frames.
    // Pass isCritical=true as 3rd arg for objects that must update every frame (e.g. player).
    this.processObjects(deltaTime, (object, data, dt) => {
        // 'object' is a THREE.Object3D (matrix updated automatically after this)
        // 'data' is the component data defined by componentSchema
        // 'dt' = deltaTime * throttleMultiplier (1-3x to catch up for skipped frames)
    });
};

this.onObjectAdded = (target, componentData) => {
    // Called when an object is registered with this lambda
};

this.onObjectRemoved = (target) => {
    // Called when an object is deregistered from this lambda
};

this.dispose = () => {
    // Cleanup resources
};
`;
