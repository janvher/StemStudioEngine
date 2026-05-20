import { BufferAttribute, BufferGeometry } from 'three';
import { describe, it, expect } from 'vitest';

import { AtlasRegion } from './types';
import { calculateUVTransform, remapGeometryUVs, findRegionByName } from './UVRemapper';

describe('UVRemapper', () => {
    describe('calculateUVTransform', () => {
        it('should calculate correct UV transform for top-left region', () => {
            const region: AtlasRegion = { name: 'test', x: 0, y: 0, width: 512, height: 512 };
            const transform = calculateUVTransform(region, 1024, 1024);

            expect(transform.offsetX).toBeCloseTo(0);
            expect(transform.offsetY).toBeCloseTo(0.5); // Flipped Y: 1 - (0 + 512) / 1024 = 0.5
            expect(transform.scaleX).toBeCloseTo(0.5);
            expect(transform.scaleY).toBeCloseTo(0.5);
        });

        it('should calculate correct UV transform for center region', () => {
            const region: AtlasRegion = { name: 'test', x: 256, y: 256, width: 512, height: 512 };
            const transform = calculateUVTransform(region, 1024, 1024);

            expect(transform.offsetX).toBeCloseTo(0.25);
            expect(transform.offsetY).toBeCloseTo(0.25); // Flipped Y: 1 - (256 + 512) / 1024 = 0.25
            expect(transform.scaleX).toBeCloseTo(0.5);
            expect(transform.scaleY).toBeCloseTo(0.5);
        });

        it('should calculate correct UV transform for bottom-right region', () => {
            const region: AtlasRegion = { name: 'test', x: 512, y: 512, width: 512, height: 512 };
            const transform = calculateUVTransform(region, 1024, 1024);

            expect(transform.offsetX).toBeCloseTo(0.5);
            expect(transform.offsetY).toBeCloseTo(0); // Flipped Y: 1 - (512 + 512) / 1024 = 0
            expect(transform.scaleX).toBeCloseTo(0.5);
            expect(transform.scaleY).toBeCloseTo(0.5);
        });

        it('should handle non-square atlases', () => {
            const region: AtlasRegion = { name: 'test', x: 0, y: 0, width: 256, height: 512 };
            const transform = calculateUVTransform(region, 2048, 1024);

            expect(transform.offsetX).toBeCloseTo(0);
            expect(transform.offsetY).toBeCloseTo(0.5);
            expect(transform.scaleX).toBeCloseTo(0.125); // 256 / 2048
            expect(transform.scaleY).toBeCloseTo(0.5);   // 512 / 1024
        });
    });

    describe('remapGeometryUVs', () => {
        it('should remap UVs for a simple quad', () => {
            const geometry = new BufferGeometry();
            // Simple quad UVs: bottom-left, bottom-right, top-right, top-left
            const uvs = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
            geometry.setAttribute('uv', new BufferAttribute(uvs, 2));

            const region: AtlasRegion = { name: 'test', x: 0, y: 0, width: 512, height: 512 };
            remapGeometryUVs(geometry, region, 1024, 1024);

            const remapped = geometry.getAttribute('uv').array as Float32Array;

            // UV (0,0) -> (0, 0.5)
            expect(remapped[0]).toBeCloseTo(0);
            expect(remapped[1]).toBeCloseTo(0.5);

            // UV (1,0) -> (0.5, 0.5)
            expect(remapped[2]).toBeCloseTo(0.5);
            expect(remapped[3]).toBeCloseTo(0.5);

            // UV (1,1) -> (0.5, 1.0)
            expect(remapped[4]).toBeCloseTo(0.5);
            expect(remapped[5]).toBeCloseTo(1.0);

            // UV (0,1) -> (0, 1.0)
            expect(remapped[6]).toBeCloseTo(0);
            expect(remapped[7]).toBeCloseTo(1.0);
        });

        it('should handle geometry without UV attribute gracefully', () => {
            const geometry = new BufferGeometry();
            // No UV attribute set

            const region: AtlasRegion = { name: 'test', x: 0, y: 0, width: 512, height: 512 };

            // Should not throw
            expect(() => {
                remapGeometryUVs(geometry, region, 1024, 1024);
            }).not.toThrow();
        });

        it('should remap to offset region correctly', () => {
            const geometry = new BufferGeometry();
            const uvs = new Float32Array([0, 0, 1, 1]);
            geometry.setAttribute('uv', new BufferAttribute(uvs, 2));

            // Region at (512, 512) in a 1024x1024 atlas
            const region: AtlasRegion = { name: 'test', x: 512, y: 512, width: 512, height: 512 };
            remapGeometryUVs(geometry, region, 1024, 1024);

            const remapped = geometry.getAttribute('uv').array as Float32Array;

            // UV (0,0) should map to (0.5, 0) - bottom-right quadrant, bottom-left corner
            expect(remapped[0]).toBeCloseTo(0.5);
            expect(remapped[1]).toBeCloseTo(0);

            // UV (1,1) should map to (1.0, 0.5) - bottom-right quadrant, top-right corner
            expect(remapped[2]).toBeCloseTo(1.0);
            expect(remapped[3]).toBeCloseTo(0.5);
        });
    });

    describe('findRegionByName', () => {
        const regions: Record<string, AtlasRegion> = {
            'wall_texture': { name: 'wall_texture', x: 0, y: 0, width: 512, height: 512 },
            'floor.png': { name: 'floor.png', x: 512, y: 0, width: 512, height: 512 },
            'CeilingMaterial': { name: 'CeilingMaterial', x: 0, y: 512, width: 512, height: 512 },
        };

        it('should find region by exact name', () => {
            const region = findRegionByName('wall_texture', regions);
            expect(region).not.toBeNull();
            expect(region?.name).toBe('wall_texture');
        });

        it('should find region case-insensitively', () => {
            const region = findRegionByName('WALL_TEXTURE', regions);
            expect(region).not.toBeNull();
            expect(region?.name).toBe('wall_texture');
        });

        it('should find region by name with extension', () => {
            const region = findRegionByName('floor.png', regions);
            expect(region).not.toBeNull();
            expect(region?.name).toBe('floor.png');
        });

        it('should find region when searching without extension', () => {
            const region = findRegionByName('floor', regions);
            expect(region).not.toBeNull();
            expect(region?.name).toBe('floor.png');
        });

        it('should return null for non-existent region', () => {
            const region = findRegionByName('nonexistent', regions);
            expect(region).toBeNull();
        });

        it('should handle mixed case matching', () => {
            const region = findRegionByName('ceilingmaterial', regions);
            expect(region).not.toBeNull();
            expect(region?.name).toBe('CeilingMaterial');
        });
    });
});
