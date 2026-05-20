# Rapier Physics Engine Integration

## Overview

The Rapier integration provides a modern, high-performance physics engine implementation using the Rust-based Rapier physics library. This module offers excellent performance characteristics and is designed as an optional enhancement to the default Ammo.js implementation.

## Key Features

- **High Performance**: ~2-3x faster than Ammo.js in many scenarios
- **Modern API**: Clean, Rust-inspired interface design
- **Advanced Character Controllers**: Built-in kinematic character controllers
- **Efficient Raycasting**: Native multi-hit raycast with layer filtering
- **Memory Efficient**: Low memory footprint and efficient garbage collection
- **Active Development**: Regular updates and improvements

## Installation & Setup

### Package Dependency
```json
{
  "dependencies": {
    "@dimforge/rapier3d-compat": "^0.14.0"
  }
}
```

### Basic Usage
```typescript
import { createRapierPhysicsWorld, isRapierAvailable } from './rapier/RapierIntegration';

// Check availability first
const available = await isRapierAvailable();
if (available) {
  const physics = createRapierPhysicsWorld(dispatcher, {
    gravity: new Vector3(0, -9.8, 0),
    enableDebug: true
  });
  await physics.start();
}
```

## Performance Characteristics

### Strengths
- **Excellent raw performance**: Optimized Rust implementation
- **Low memory usage**: Efficient memory management
- **Fast character controllers**: Native kinematic character support
- **Advanced raycasting**: Built-in layer filtering and multi-hit detection
- **Modern architecture**: Clean separation of concerns

### Considerations
- **Bundle size**: Larger initial download (~2MB WASM)
- **Initialization time**: Slightly longer startup due to WASM loading
- **Soft body physics**: Limited compared to Ammo.js
- **Ecosystem maturity**: Newer than Bullet Physics

## When to Use Rapier

### Recommended For:
- **New projects** with performance requirements
- **Character-heavy games** (platformers, action games)
- **Real-time simulations** with many physics objects
- **Mobile applications** where performance is critical
- **Applications requiring advanced raycasting**

### Consider Ammo.js For:
- **Soft body physics** requirements
- **Legacy project compatibility**
- **Quick prototyping** with immediate availability
- **Proven stability** requirements

## API Differences from Ammo.js

### Shape Creation
```typescript
// Rapier uses more intuitive dimension parameters
physics.addBox(object, {
  width: 2,      // Full width (not half-extents)
  height: 1,     // Full height
  length: 3      // Full length
});

// Character controllers are more advanced
physics.addPlayerObject(uuid, true, {
  radius: 0.4,
  height: 1.8,
  stepHeight: 0.3  // Native step climbing
});
```

### Advanced Raycasting
```typescript
// Native layer filtering support
const hit = physics.raycast(origin, direction, {
  maxDistance: 100,
  includeLayers: PhysicsLayer.PLAYER | PhysicsLayer.ENEMY,
  returnAllHits: true
});
```

## Configuration Options

### Initialization Options
```typescript
interface RapierInitOptions {
  gravity?: Vector3;           // Default: (0, -9.8, 0)
  enableDebug?: boolean;       // Default: false
  sleepingEnabled?: boolean;   // Default: true
  maxStepsPerFrame?: number;   // Default: 5
  timeStep?: number;          // Default: 1/60
}
```

### Performance Tuning
```typescript
// Optimize for different scenarios
const gamePhysics = createRapierPhysicsWorld(dispatcher, {
  // For character-heavy games
  maxStepsPerFrame: 3,
  timeStep: 1/120,  // Higher precision for smooth character movement
  
  // For physics-heavy simulations
  maxStepsPerFrame: 8,
  timeStep: 1/60    // Standard physics timestep
});
```

## Memory Management

### Automatic Cleanup
Rapier handles most memory management automatically:

```typescript
// Objects are automatically cleaned up when removed
physics.remove(objectUuid);  // No manual memory management needed

// World cleanup on termination
physics.terminate();  // Cleans up all WASM memory
```

### Best Practices
```typescript
// Avoid creating temporary objects in hot paths
// Good: Reuse vectors
const reusableVector = new Vector3();
function updatePhysics() {
  reusableVector.set(x, y, z);
  physics.setOrigin(uuid, reusableVector);
}

// Avoid: Creating new vectors each frame
function updatePhysicsBad() {
  physics.setOrigin(uuid, new Vector3(x, y, z));  // Memory allocation each frame
}
```

## Debugging & Profiling

### Debug Visualization
```typescript
// Enable debug rendering
const debugMesh = physics.initDebug();
if (debugMesh) {
  scene.add(debugMesh);
}

// Performance monitoring
const startTime = performance.now();
physics.simulate(deltaTime);
const physicsTime = performance.now() - startTime;
console.log(`Physics simulation time: ${physicsTime.toFixed(2)}ms`);
```

### Common Performance Issues

1. **Too Many Dynamic Bodies**
   ```typescript
   // Problem: Everything dynamic
   physics.addBox(object, { collision_flag: CollisionFlag.DYNAMIC });
   
   // Solution: Use static/kinematic where appropriate
   physics.addBox(object, { collision_flag: CollisionFlag.STATIC });
   ```

2. **Complex Collision Meshes**
   ```typescript
   // Problem: Complex mesh for simple objects
   physics.addConcaveHull(object, complexMeshData);
   
   // Solution: Use primitive shapes
   physics.addBox(object, simplifiedBoxData);
   ```

## Migration from Ammo.js

### Automatic Compatibility
The unified IPhysics interface ensures seamless migration:

```typescript
// This code works with both engines
physics.addBox(boxObject, boxData);
physics.addPlayerObject(playerUuid, true, playerOptions);
const hit = physics.raycast?.(origin, direction, raycastOptions);
```

### Performance Comparison
```typescript
// Benchmark both engines
async function benchmarkEngines() {
  const ammoTime = await benchmarkEngine(PhysicsEngineType.AMMO);
  const rapierTime = await benchmarkEngine(PhysicsEngineType.RAPIER);
  
  console.log(`Ammo: ${ammoTime}ms, Rapier: ${rapierTime}ms`);
  console.log(`Rapier is ${(ammoTime / rapierTime).toFixed(1)}x faster`);
}
```

## Architecture Details

### Module Structure
```
rapier/
├── RapierPhysicsWorld.ts     # Main engine implementation
├── RapierIntegration.ts      # Factory functions and utilities
└── README.md                 # This documentation
```

### Dependencies
- `@dimforge/rapier3d-compat`: Core Rapier physics library
- `three`: Vector3, Quaternion types and utilities

### Integration Points
```typescript
// Factory function
export function createRapierPhysicsWorld(
  dispatcher: IDispatcher, 
  options?: PhysicsInitOptions
): RapierPhysicsWorld;

// Availability checking
export async function isRapierAvailable(): Promise<boolean>;

// Engine selection
const engine = PhysicsEngineSelector.selectEngine({
  supportsAdvancedRaycast: true
}); // May return RAPIER
```

## Troubleshooting

### Common Issues

#### WASM Loading Failures
```typescript
// Problem: Network issues or CORS
try {
  const available = await isRapierAvailable();
} catch (error) {
  console.warn('Rapier unavailable, falling back to Ammo:', error);
  // Use Ammo.js fallback
}
```

#### Performance Regression
```typescript
// Check if physics is the bottleneck
const frameStart = performance.now();
physics.simulate(deltaTime);
const physicsTime = performance.now() - frameStart;

if (physicsTime > 16.67) {  // > 1/60th second
  console.warn('Physics taking too long:', physicsTime);
  // Consider reducing timestep or object count
}
```

#### Memory Issues
```typescript
// Monitor memory usage
const memoryBefore = performance.memory?.usedJSHeapSize || 0;
physics.simulate(deltaTime);
const memoryAfter = performance.memory?.usedJSHeapSize || 0;
const memoryDelta = memoryAfter - memoryBefore;

if (memoryDelta > 1000000) {  // > 1MB per frame
  console.warn('Potential memory leak detected');
}
```

## Future Roadmap

### Planned Enhancements
- **Soft body integration**: Improved soft body physics support
- **GPU acceleration**: Leveraging WebGPU for physics computation
- **Advanced constraints**: More joint and constraint types
- **Networking optimization**: Better multiplayer physics synchronization

### Community Contributions
- Performance benchmarking across different scenarios
- Additional shape types and utilities
- Documentation improvements and examples
- Integration with other Three.js libraries

---

*For technical support or questions about Rapier integration, please refer to the main physics documentation or create an issue in the project repository.* 