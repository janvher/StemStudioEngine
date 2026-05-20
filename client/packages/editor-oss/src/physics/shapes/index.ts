/**
 * Modern Physics Shape System
 * 
 * This module provides modern shape type definitions without legacy prefixes
 * and includes backward compatibility mapping for existing code.
 * 
 * @module physics/shapes
 */

/**
 * Modern shape types for physics bodies.
 * These types are engine-agnostic and represent the logical shape concept
 * rather than implementation-specific class names.
 */
export enum BodyShapeType {
    /** Basic box/cuboid shape */
    BOX = "box",
    
    /** Spherical shape */
    SPHERE = "sphere",
    
    /** Capsule shape (cylinder with hemispherical ends) */
    CAPSULE = "capsule",
    
    /** Convex hull generated from vertices */
    CONVEX_HULL = "convexHull",
    
    /** Concave hull/trimesh for complex static geometry */
    CONCAVE_HULL = "concaveHull",
    
    /** Terrain heightfield shape */
    TERRAIN = "terrain",
    
    /** Complex 3D model shape */
    MODEL = "model",
    
    /** Triangle mesh shape */
    TRIANGLE_MESH = "triangleMesh",
    
    /** Heightfield shape for terrain-like surfaces */
    HEIGHTFIELD = "heightfield",
    
    /** Compound shape composed of multiple child shapes */
    COMPOUND = "compound"
}

/**
 * Legacy shape type mapping for backward compatibility.
 * Maps old Bullet Physics (bt) prefixed types to modern shape types.
 */
export const LEGACY_SHAPE_TYPES: Record<string, BodyShapeType> = {
    // Core shapes
    btBoxShape: BodyShapeType.BOX,
    btSphereShape: BodyShapeType.SPHERE,
    btCapsuleShape: BodyShapeType.CAPSULE,
    btConvexHullShape: BodyShapeType.CONVEX_HULL,
    btConcaveHullShape: BodyShapeType.CONCAVE_HULL,
    
    // Additional shapes
    btCompoundShape: BodyShapeType.COMPOUND,
    btHeightfieldTerrainShape: BodyShapeType.HEIGHTFIELD,
    btBvhTriangleMeshShape: BodyShapeType.TRIANGLE_MESH,
    
    // Terrain aliases
    btTerrainShape: BodyShapeType.TERRAIN,
    TerrainShape: BodyShapeType.TERRAIN,
    
    // Model aliases
    ModelShape: BodyShapeType.MODEL,
    btModelShape: BodyShapeType.MODEL,
};

/**
 * Reverse mapping from modern shape types to legacy types.
 * Useful for maintaining compatibility with existing physics implementations.
 */
export const MODERN_TO_LEGACY_SHAPE_TYPES: Record<BodyShapeType, string> = {
    [BodyShapeType.BOX]: "btBoxShape",
    [BodyShapeType.SPHERE]: "btSphereShape",
    [BodyShapeType.CAPSULE]: "btCapsuleShape",
    [BodyShapeType.CONVEX_HULL]: "btConvexHullShape",
    [BodyShapeType.CONCAVE_HULL]: "btConcaveHullShape",
    [BodyShapeType.COMPOUND]: "btCompoundShape",
    [BodyShapeType.HEIGHTFIELD]: "btHeightfieldTerrainShape",
    [BodyShapeType.TRIANGLE_MESH]: "btBvhTriangleMeshShape",
    [BodyShapeType.TERRAIN]: "btTerrainShape",
    [BodyShapeType.MODEL]: "btModelShape",
};

/**
 * Shape categories for grouping related shape types
 */
export enum ShapeCategory {
    /** Basic primitive shapes */
    PRIMITIVE = "primitive",
    
    /** Complex mesh-based shapes */
    MESH = "mesh",
    
    /** Terrain and heightfield shapes */
    TERRAIN = "terrain",
    
    /** Composite shapes */
    COMPOSITE = "composite"
}

/**
 * Mapping of shape types to their categories
 */
export const SHAPE_CATEGORIES: Record<BodyShapeType, ShapeCategory> = {
    [BodyShapeType.BOX]: ShapeCategory.PRIMITIVE,
    [BodyShapeType.SPHERE]: ShapeCategory.PRIMITIVE,
    [BodyShapeType.CAPSULE]: ShapeCategory.PRIMITIVE,
    [BodyShapeType.CONVEX_HULL]: ShapeCategory.MESH,
    [BodyShapeType.CONCAVE_HULL]: ShapeCategory.MESH,
    [BodyShapeType.TRIANGLE_MESH]: ShapeCategory.MESH,
    [BodyShapeType.MODEL]: ShapeCategory.MESH,
    [BodyShapeType.TERRAIN]: ShapeCategory.TERRAIN,
    [BodyShapeType.HEIGHTFIELD]: ShapeCategory.TERRAIN,
    [BodyShapeType.COMPOUND]: ShapeCategory.COMPOSITE,
};

/**
 * Helper function to convert legacy shape type to modern shape type
 * @param legacyType - Legacy shape type string (e.g., "btBoxShape")
 * @returns Modern BodyShapeType or undefined if not found
 */
export function convertLegacyShapeType(legacyType: string): BodyShapeType | undefined {
    return LEGACY_SHAPE_TYPES[legacyType];
}

/**
 * Helper function to get legacy shape type from modern shape type
 * @param modernType - Modern BodyShapeType
 * @returns Legacy shape type string
 */
export function getLegacyShapeType(modernType: BodyShapeType): string {
    return MODERN_TO_LEGACY_SHAPE_TYPES[modernType];
}

/**
 * Check if a shape type is a primitive shape
 * @param shapeType - Shape type to check
 * @returns True if the shape is a primitive type
 */
export function isPrimitiveShape(shapeType: BodyShapeType): boolean {
    return SHAPE_CATEGORIES[shapeType] === ShapeCategory.PRIMITIVE;
}

/**
 * Check if a shape type is a mesh-based shape
 * @param shapeType - Shape type to check
 * @returns True if the shape is a mesh type
 */
export function isMeshShape(shapeType: BodyShapeType): boolean {
    return SHAPE_CATEGORIES[shapeType] === ShapeCategory.MESH;
}

/**
 * Check if a shape type is a terrain shape
 * @param shapeType - Shape type to check
 * @returns True if the shape is a terrain type
 */
export function isTerrainShape(shapeType: BodyShapeType): boolean {
    return SHAPE_CATEGORIES[shapeType] === ShapeCategory.TERRAIN;
}

/**
 * Get the category of a shape type
 * @param shapeType - Shape type to categorize
 * @returns Shape category
 */
export function getShapeCategory(shapeType: BodyShapeType): ShapeCategory {
    return SHAPE_CATEGORIES[shapeType];
} 