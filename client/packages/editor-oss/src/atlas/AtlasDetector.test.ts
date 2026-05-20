import { describe, it, expect } from 'vitest';

import { isAtlasJsonFile, findAtlasFiles, parseAtlasJson, loadAtlas } from './AtlasDetector';

describe('AtlasDetector', () => {
    describe('isAtlasJsonFile', () => {
        it('should detect atlas.json', () => {
            expect(isAtlasJsonFile('atlas.json')).toBe(true);
            expect(isAtlasJsonFile('Atlas.json')).toBe(true);
            expect(isAtlasJsonFile('ATLAS.JSON')).toBe(true);
        });

        it('should detect atlas.json in subdirectories', () => {
            expect(isAtlasJsonFile('textures/atlas.json')).toBe(true);
            expect(isAtlasJsonFile('models/textures/atlas.json')).toBe(true);
        });

        it('should detect *_atlas.json pattern', () => {
            expect(isAtlasJsonFile('building_atlas.json')).toBe(true);
            expect(isAtlasJsonFile('character_atlas.json')).toBe(true);
            expect(isAtlasJsonFile('textures/terrain_atlas.json')).toBe(true);
        });

        it('should detect *.atlas.json pattern', () => {
            expect(isAtlasJsonFile('building.atlas.json')).toBe(true);
            expect(isAtlasJsonFile('props.atlas.json')).toBe(true);
        });

        it('should detect texture_atlas.json and textureatlas.json patterns', () => {
            expect(isAtlasJsonFile('texture_atlas.json')).toBe(true);
            expect(isAtlasJsonFile('texture-atlas.json')).toBe(true);
            expect(isAtlasJsonFile('textureatlas.json')).toBe(true);
        });

        it('should not match non-atlas JSON files', () => {
            expect(isAtlasJsonFile('config.json')).toBe(false);
            expect(isAtlasJsonFile('model.gltf')).toBe(false);
            expect(isAtlasJsonFile('package.json')).toBe(false);
            expect(isAtlasJsonFile('settings.json')).toBe(false);
        });
    });

    describe('findAtlasFiles', () => {
        it('should find atlas files in fileBlobMap', () => {
            const fileBlobMap = new Map<string, Blob>([
                ['model.glb', new Blob()],
                ['atlas.json', new Blob()],
                ['atlas.png', new Blob()],
            ]);

            const result = findAtlasFiles(fileBlobMap);
            expect(result).toEqual(['atlas.json']);
        });

        it('should find multiple atlas files', () => {
            const fileBlobMap = new Map<string, Blob>([
                ['model.glb', new Blob()],
                ['textures/atlas.json', new Blob()],
                ['materials/props_atlas.json', new Blob()],
            ]);

            const result = findAtlasFiles(fileBlobMap);
            expect(result).toHaveLength(2);
            expect(result).toContain('textures/atlas.json');
            expect(result).toContain('materials/props_atlas.json');
        });

        it('should return empty array when no atlas files', () => {
            const fileBlobMap = new Map<string, Blob>([
                ['model.glb', new Blob()],
                ['texture.png', new Blob()],
            ]);

            const result = findAtlasFiles(fileBlobMap);
            expect(result).toEqual([]);
        });
    });

    describe('parseAtlasJson', () => {
        it('should parse valid atlas JSON', async () => {
            const validJson = JSON.stringify({
                image: 'atlas.png',
                width: 1024,
                height: 1024,
                regions: {
                    texture1: { x: 0, y: 0, width: 512, height: 512 },
                    texture2: { x: 512, y: 0, width: 512, height: 512 },
                },
            });
            const blob = new Blob([validJson], { type: 'application/json' });

            const result = await parseAtlasJson(blob);
            expect(result).not.toBeNull();
            expect(result?.image).toBe('atlas.png');
            expect(result?.width).toBe(1024);
            expect(result?.height).toBe(1024);
            expect(Object.keys(result?.regions || {})).toHaveLength(2);
        });

        it('should parse TexturePacker format with frames', async () => {
            const texturePackerJson = JSON.stringify({
                image: 'spritesheet.png',
                width: 2048,
                height: 2048,
                frames: {
                    sprite1: { frame: { x: 0, y: 0, w: 64, h: 64 }, sourceSize: { w: 64, h: 64 } },
                    sprite2: { frame: { x: 64, y: 0, w: 128, h: 128 }, sourceSize: { w: 128, h: 128 } },
                },
            });
            const blob = new Blob([texturePackerJson], { type: 'application/json' });

            const result = await parseAtlasJson(blob);
            expect(result).not.toBeNull();
            expect(result?.regions.sprite1).toBeDefined();
            expect(result?.regions.sprite1!.width).toBe(64);
            expect(result?.regions.sprite2!.width).toBe(128);
        });

        it('should return null for invalid JSON', async () => {
            const invalidJson = '{ invalid json }';
            const blob = new Blob([invalidJson], { type: 'application/json' });

            const result = await parseAtlasJson(blob);
            expect(result).toBeNull();
        });

        it('should return null for missing required fields', async () => {
            const missingFields = JSON.stringify({
                image: 'atlas.png',
                // missing width and height
            });
            const blob = new Blob([missingFields], { type: 'application/json' });

            const result = await parseAtlasJson(blob);
            expect(result).toBeNull();
        });
    });

    describe('loadAtlas', () => {
        it('should load atlas with texture in same directory', async () => {
            const atlasJson = JSON.stringify({
                image: 'atlas.png',
                width: 1024,
                height: 1024,
                regions: { tex1: { x: 0, y: 0, width: 512, height: 512 } },
            });
            const atlasBlob = new Blob([atlasJson], { type: 'application/json' });
            const textureBlob = new Blob(['fake-png-data'], { type: 'image/png' });

            const fileBlobMap = new Map<string, Blob>([
                ['atlas.json', atlasBlob],
                ['atlas.png', textureBlob],
            ]);

            const result = await loadAtlas('atlas.json', fileBlobMap, '');
            expect(result).not.toBeNull();
            expect(result?.config.image).toBe('atlas.png');
            expect(result?.textureBlob).toBe(textureBlob);
        });

        it('should load atlas with texture in subdirectory', async () => {
            const atlasJson = JSON.stringify({
                image: 'atlas.png',
                width: 1024,
                height: 1024,
                regions: {},
            });
            const atlasBlob = new Blob([atlasJson], { type: 'application/json' });
            const textureBlob = new Blob(['fake-png-data'], { type: 'image/png' });

            const fileBlobMap = new Map<string, Blob>([
                ['textures/atlas.json', atlasBlob],
                ['textures/atlas.png', textureBlob],
            ]);

            const result = await loadAtlas('textures/atlas.json', fileBlobMap, '');
            expect(result).not.toBeNull();
            expect(result?.textureBlob).toBe(textureBlob);
        });

        it('should return null when texture not found', async () => {
            const atlasJson = JSON.stringify({
                image: 'missing.png',
                width: 1024,
                height: 1024,
                regions: {},
            });
            const atlasBlob = new Blob([atlasJson], { type: 'application/json' });

            const fileBlobMap = new Map<string, Blob>([
                ['atlas.json', atlasBlob],
            ]);

            const result = await loadAtlas('atlas.json', fileBlobMap, '');
            expect(result).toBeNull();
        });

        it('should find texture case-insensitively', async () => {
            const atlasJson = JSON.stringify({
                image: 'Atlas.PNG',
                width: 1024,
                height: 1024,
                regions: {},
            });
            const atlasBlob = new Blob([atlasJson], { type: 'application/json' });
            const textureBlob = new Blob(['fake-png-data'], { type: 'image/png' });

            const fileBlobMap = new Map<string, Blob>([
                ['atlas.json', atlasBlob],
                ['atlas.png', textureBlob],
            ]);

            const result = await loadAtlas('atlas.json', fileBlobMap, '');
            expect(result).not.toBeNull();
            expect(result?.textureBlob).toBe(textureBlob);
        });
    });
});
