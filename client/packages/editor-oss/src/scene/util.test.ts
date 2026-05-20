vi.mock('three', async (importOriginal) => ({
    ...await importOriginal<typeof import('three')>(),
    Audio: vi.fn(),
    AudioListener: vi.fn(),
}));

const mockFromJson = vi.fn();
vi.mock('../serialization/Converter', () => ({
    default: class MockConverter {
        fromJson = mockFromJson;
    },
}));

vi.mock('../utils/SceneLoadProfiler', () => ({
    SceneLoadProfiler: { begin: vi.fn(), end: vi.fn() },
}));

import { Object3D, Scene, PerspectiveCamera } from 'three';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { loadScene } from './util';
import { AssetRef } from '@stem/editor-oss/asset-management/AssetRef';
import { getAssetResolutionContext, setAssetResolutionContext } from '@stem/editor-oss/asset-management/AssetResolutionContext';

describe('loadScene', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const makeSceneWithBehaviorAssetRefs = (refs: AssetRef[]) => {
        const scene = new Scene();
        const child = new Object3D();
        child.userData.behaviors = [
            { attributesData: Object.fromEntries(refs.map((ref, i) => [`ref${i}`, ref])) },
        ];
        scene.add(child);
        return scene;
    };

    it('should resolve behavior attribute revisionIds after mapping asset IDs (clone scenario)', async () => {
        // Simulate a cloned scene where:
        // - "original-asset" was the source scene's asset ID
        // - "cloned-asset" is the new cloned asset ID
        // - The blob still has the original revision ID "original-rev"
        const ref: AssetRef = { assetId: 'original-asset', revisionId: 'original-rev' };
        const scene = makeSceneWithBehaviorAssetRefs([ref]);

        mockFromJson.mockResolvedValue({ scene });

        await loadScene({
            server: 'http://localhost',
            camera: new PerspectiveCamera(),
            domWidth: 800,
            domHeight: 600,
            sceneData: {
                data: {},
                metadata: {
                    Dependencies: { 'cloned-asset': 'cloned-rev' },
                    LogicalIDToAssetID: { 'original-asset': 'cloned-asset' },
                },
            },
        });

        // After loading, assetId should be remapped and revisionId resolved
        expect(ref.assetId).toBe('cloned-asset');
        expect(ref.revisionId).toBe('cloned-rev');
    });

    it('should resolve nested and array behavior attribute asset refs', async () => {
        const nestedRef: AssetRef = { assetId: 'orig-1', revisionId: 'old-rev-1' };
        const arrayRef1: AssetRef = { assetId: 'orig-2', revisionId: 'old-rev-2' };
        const arrayRef2: AssetRef = { assetId: 'orig-3', revisionId: 'old-rev-3' };

        const scene = new Scene();
        const child = new Object3D();
        child.userData.behaviors = [
            {
                attributesData: {
                    group: { nested: nestedRef },
                    items: [arrayRef1, arrayRef2],
                },
            },
        ];
        scene.add(child);

        mockFromJson.mockResolvedValue({ scene });

        await loadScene({
            server: 'http://localhost',
            camera: new PerspectiveCamera(),
            domWidth: 800,
            domHeight: 600,
            sceneData: {
                data: {},
                metadata: {
                    Dependencies: {
                        'cloned-1': 'rev-1',
                        'cloned-2': 'rev-2',
                        'cloned-3': 'rev-3',
                    },
                    LogicalIDToAssetID: {
                        'orig-1': 'cloned-1',
                        'orig-2': 'cloned-2',
                        'orig-3': 'cloned-3',
                    },
                },
            },
        });

        expect(nestedRef.assetId).toBe('cloned-1');
        expect(nestedRef.revisionId).toBe('rev-1');
        expect(arrayRef1.assetId).toBe('cloned-2');
        expect(arrayRef1.revisionId).toBe('rev-2');
        expect(arrayRef2.assetId).toBe('cloned-3');
        expect(arrayRef2.revisionId).toBe('rev-3');
    });

    it('should resolve revisionIds even without a logical ID mapping', async () => {
        const ref: AssetRef = { assetId: 'my-asset', revisionId: 'stale-rev' };
        const scene = makeSceneWithBehaviorAssetRefs([ref]);

        mockFromJson.mockResolvedValue({ scene });

        await loadScene({
            server: 'http://localhost',
            camera: new PerspectiveCamera(),
            domWidth: 800,
            domHeight: 600,
            sceneData: {
                data: {},
                metadata: {
                    Dependencies: { 'my-asset': 'current-rev' },
                },
            },
        });

        // No LogicalIDToAssetID → assetId unchanged, revisionId resolved from Dependencies
        expect(ref.assetId).toBe('my-asset');
        expect(ref.revisionId).toBe('current-rev');
    });

    it('should use the prefab own context for its children', async () => {
        const scene = new Scene();

        // Scene-level object — resolved against scene context
        const sceneRef: AssetRef = { assetId: 'scene-asset', revisionId: 'old-rev' };
        const sceneChild = new Object3D();
        sceneChild.userData.behaviors = [{ attributesData: { ref: sceneRef } }];
        scene.add(sceneChild);

        // Prefab root — its behaviors (attribute overrides from the scene
        // blob) are resolved against the scene context.
        const prefabRootRef: AssetRef = { assetId: 'scene-asset', revisionId: 'old-rev' };
        const prefab = new Object3D();
        prefab.userData.behaviors = [{ attributesData: { ref: prefabRootRef } }];
        setAssetResolutionContext(prefab, {
            assetIdToRevisionId: { 'prefab-internal': 'prefab-rev' },
        });
        scene.add(prefab);

        // Prefab's child — resolved against the prefab's own context, not
        // the scene context.
        const prefabChildRef: AssetRef = { assetId: 'prefab-internal', revisionId: 'stale' };
        const prefabInner = new Object3D();
        prefabInner.userData.behaviors = [{ attributesData: { ref: prefabChildRef } }];
        prefab.add(prefabInner);

        mockFromJson.mockResolvedValue({ scene });

        await loadScene({
            server: 'http://localhost',
            camera: new PerspectiveCamera(),
            domWidth: 800,
            domHeight: 600,
            sceneData: {
                data: {},
                metadata: {
                    Dependencies: { 'scene-asset': 'new-rev' },
                },
            },
        });

        // Scene-level ref resolved against scene context
        expect(sceneRef.revisionId).toBe('new-rev');

        // Prefab root ref resolved against scene context
        expect(prefabRootRef.revisionId).toBe('new-rev');

        // Prefab child ref resolved against the prefab's own context
        expect(prefabChildRef.revisionId).toBe('prefab-rev');
    });

    it('should remove logicalIdToAssetId from the scene context after loading', async () => {
        const scene = new Scene();

        mockFromJson.mockResolvedValue({ scene });

        await loadScene({
            server: 'http://localhost',
            camera: new PerspectiveCamera(),
            domWidth: 800,
            domHeight: 600,
            sceneData: {
                data: {},
                metadata: {
                    Dependencies: { 'cloned-asset': 'cloned-rev' },
                    LogicalIDToAssetID: { 'original-asset': 'cloned-asset' },
                },
            },
        });

        const ctx = getAssetResolutionContext(scene);
        expect(ctx?.logicalIdToAssetId).toBeUndefined();
        expect(ctx?.assetIdToRevisionId).toEqual({ 'cloned-asset': 'cloned-rev' });
    });
});
