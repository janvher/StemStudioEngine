import {
    BodyShapeType,
    LEGACY_SHAPE_TYPES,
    MODERN_TO_LEGACY_SHAPE_TYPES,
    ShapeCategory,
    SHAPE_CATEGORIES,
    convertLegacyShapeType,
    getLegacyShapeType,
    isPrimitiveShape,
    isMeshShape,
    isTerrainShape,
    getShapeCategory,
} from './index';

describe('Shape System', () => {
    describe('BodyShapeType enum', () => {
        it('should have all expected shape types', () => {
            expect(BodyShapeType.BOX).toBe('box');
            expect(BodyShapeType.SPHERE).toBe('sphere');
            expect(BodyShapeType.CAPSULE).toBe('capsule');
            expect(BodyShapeType.CONVEX_HULL).toBe('convexHull');
            expect(BodyShapeType.CONCAVE_HULL).toBe('concaveHull');
            expect(BodyShapeType.TERRAIN).toBe('terrain');
            expect(BodyShapeType.MODEL).toBe('model');
            expect(BodyShapeType.TRIANGLE_MESH).toBe('triangleMesh');
            expect(BodyShapeType.HEIGHTFIELD).toBe('heightfield');
            expect(BodyShapeType.COMPOUND).toBe('compound');
        });
    });

    describe('Legacy shape type mapping', () => {
        it('should map legacy types to modern types', () => {
            expect(LEGACY_SHAPE_TYPES.btBoxShape).toBe(BodyShapeType.BOX);
            expect(LEGACY_SHAPE_TYPES.btSphereShape).toBe(BodyShapeType.SPHERE);
            expect(LEGACY_SHAPE_TYPES.btCapsuleShape).toBe(BodyShapeType.CAPSULE);
            expect(LEGACY_SHAPE_TYPES.btConvexHullShape).toBe(BodyShapeType.CONVEX_HULL);
            expect(LEGACY_SHAPE_TYPES.btConcaveHullShape).toBe(BodyShapeType.CONCAVE_HULL);
        });

        it('should handle terrain aliases', () => {
            expect(LEGACY_SHAPE_TYPES.btTerrainShape).toBe(BodyShapeType.TERRAIN);
            expect(LEGACY_SHAPE_TYPES.TerrainShape).toBe(BodyShapeType.TERRAIN);
        });

        it('should handle model aliases', () => {
            expect(LEGACY_SHAPE_TYPES.ModelShape).toBe(BodyShapeType.MODEL);
            expect(LEGACY_SHAPE_TYPES.btModelShape).toBe(BodyShapeType.MODEL);
        });
    });

    describe('Modern to legacy mapping', () => {
        it('should map modern types back to legacy types', () => {
            expect(MODERN_TO_LEGACY_SHAPE_TYPES[BodyShapeType.BOX]).toBe('btBoxShape');
            expect(MODERN_TO_LEGACY_SHAPE_TYPES[BodyShapeType.SPHERE]).toBe('btSphereShape');
            expect(MODERN_TO_LEGACY_SHAPE_TYPES[BodyShapeType.CAPSULE]).toBe('btCapsuleShape');
        });
    });

    describe('Shape categories', () => {
        it('should categorize primitive shapes correctly', () => {
            expect(SHAPE_CATEGORIES[BodyShapeType.BOX]).toBe(ShapeCategory.PRIMITIVE);
            expect(SHAPE_CATEGORIES[BodyShapeType.SPHERE]).toBe(ShapeCategory.PRIMITIVE);
            expect(SHAPE_CATEGORIES[BodyShapeType.CAPSULE]).toBe(ShapeCategory.PRIMITIVE);
        });

        it('should categorize mesh shapes correctly', () => {
            expect(SHAPE_CATEGORIES[BodyShapeType.CONVEX_HULL]).toBe(ShapeCategory.MESH);
            expect(SHAPE_CATEGORIES[BodyShapeType.CONCAVE_HULL]).toBe(ShapeCategory.MESH);
            expect(SHAPE_CATEGORIES[BodyShapeType.TRIANGLE_MESH]).toBe(ShapeCategory.MESH);
            expect(SHAPE_CATEGORIES[BodyShapeType.MODEL]).toBe(ShapeCategory.MESH);
        });

        it('should categorize terrain shapes correctly', () => {
            expect(SHAPE_CATEGORIES[BodyShapeType.TERRAIN]).toBe(ShapeCategory.TERRAIN);
            expect(SHAPE_CATEGORIES[BodyShapeType.HEIGHTFIELD]).toBe(ShapeCategory.TERRAIN);
        });

        it('should categorize composite shapes correctly', () => {
            expect(SHAPE_CATEGORIES[BodyShapeType.COMPOUND]).toBe(ShapeCategory.COMPOSITE);
        });
    });

    describe('Helper functions', () => {
        describe('convertLegacyShapeType', () => {
            it('should convert legacy types to modern types', () => {
                expect(convertLegacyShapeType('btBoxShape')).toBe(BodyShapeType.BOX);
                expect(convertLegacyShapeType('btSphereShape')).toBe(BodyShapeType.SPHERE);
            });

            it('should return undefined for unknown types', () => {
                expect(convertLegacyShapeType('unknownShape')).toBeUndefined();
            });
        });

        describe('getLegacyShapeType', () => {
            it('should get legacy type from modern type', () => {
                expect(getLegacyShapeType(BodyShapeType.BOX)).toBe('btBoxShape');
                expect(getLegacyShapeType(BodyShapeType.SPHERE)).toBe('btSphereShape');
            });
        });

        describe('isPrimitiveShape', () => {
            it('should identify primitive shapes', () => {
                expect(isPrimitiveShape(BodyShapeType.BOX)).toBe(true);
                expect(isPrimitiveShape(BodyShapeType.SPHERE)).toBe(true);
                expect(isPrimitiveShape(BodyShapeType.CAPSULE)).toBe(true);
            });

            it('should return false for non-primitive shapes', () => {
                expect(isPrimitiveShape(BodyShapeType.CONVEX_HULL)).toBe(false);
                expect(isPrimitiveShape(BodyShapeType.TERRAIN)).toBe(false);
            });
        });

        describe('isMeshShape', () => {
            it('should identify mesh shapes', () => {
                expect(isMeshShape(BodyShapeType.CONVEX_HULL)).toBe(true);
                expect(isMeshShape(BodyShapeType.CONCAVE_HULL)).toBe(true);
                expect(isMeshShape(BodyShapeType.MODEL)).toBe(true);
            });

            it('should return false for non-mesh shapes', () => {
                expect(isMeshShape(BodyShapeType.BOX)).toBe(false);
                expect(isMeshShape(BodyShapeType.TERRAIN)).toBe(false);
            });
        });

        describe('isTerrainShape', () => {
            it('should identify terrain shapes', () => {
                expect(isTerrainShape(BodyShapeType.TERRAIN)).toBe(true);
                expect(isTerrainShape(BodyShapeType.HEIGHTFIELD)).toBe(true);
            });

            it('should return false for non-terrain shapes', () => {
                expect(isTerrainShape(BodyShapeType.BOX)).toBe(false);
                expect(isTerrainShape(BodyShapeType.CONVEX_HULL)).toBe(false);
            });
        });

        describe('getShapeCategory', () => {
            it('should return correct category for all shapes', () => {
                expect(getShapeCategory(BodyShapeType.BOX)).toBe(ShapeCategory.PRIMITIVE);
                expect(getShapeCategory(BodyShapeType.CONVEX_HULL)).toBe(ShapeCategory.MESH);
                expect(getShapeCategory(BodyShapeType.TERRAIN)).toBe(ShapeCategory.TERRAIN);
                expect(getShapeCategory(BodyShapeType.COMPOUND)).toBe(ShapeCategory.COMPOSITE);
            });
        });
    });
}); 