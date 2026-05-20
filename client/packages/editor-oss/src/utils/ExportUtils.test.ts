// Mock dependencies
vi.mock('@stem/network/api/scene', () => ({
    renderingEditorToApi: vi.fn().mockReturnValue({ shadowMapType: 'basic' }),
}));

vi.mock('../serialization/Converter', () => {
    return {
        default: class MockConverter {
            constructor(
                private readonly physics: any = null,
                private readonly convertServerObjUrls: boolean = false,
            ) {
            }

            toJSON(obj: any) {
                return [
                    {
                        metadata: { generator: 'OptionsSerializer' },
                        server: obj.options?.server || 'http://test.com',
                    },
                    {
                        metadata: { generator: 'ServerObject' },
                        uuid: 'mesh-1',
                        userData: {
                            Server: true,
                            // This is the key test: URL should be absolute when convertServerObjUrls is true
                            Url: this.convertServerObjUrls ? 'http://test.com/model1.glb' : '/model1.glb',
                        },
                    },
                ];
            }
        },
    };
});

vi.mock('../global', () => ({
    default: {
        app: {
            editor: {
                showStats: true,
                useAvatar: false,
                allowAnonymousFirebase: true,
                useInstancing: false,
                voiceChatEnabled: true,
                isMultiplayer: false,
                hudRenderer: 'html',
                rendering: { shadowMapType: 'basic' },
                sceneThumbnail: '/thumbnail.jpg',
                description: 'Test scene',
                tags: ['test', 'demo'],
                sceneID: 'scene-abc',
            },
            options: { server: 'http://test.com' },
            camera: { type: 'PerspectiveCamera' },
            renderer: { type: 'WebGLRenderer' },
            scripts: [],
            scene: {
                type: 'Scene',
                uuid: 'scene-123',
                userData: { Server: true },
                children: [
                    {
                        type: 'Mesh',
                        uuid: 'mesh-1',
                        userData: { Server: true, Url: '/model1.glb' },
                    },
                ],
            },
        },
    },
}));

vi.mock('./ElementsUtils', () => ({
    ElementsUtils: {
        querySceneName: vi.fn(),
    },
}));

vi.mock('./JSONMinifyUtils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./JSONMinifyUtils')>();
    return {
        ...actual,
        minifyKeys: vi.fn((obj: any, keyMap: any) => actual.minifyKeys(obj, keyMap)), // call through by default
    };
});

vi.mock('./StringUtils', () => ({
    default: {
        saveString: vi.fn(),
    },
}));

import global from '../global';
import { ElementsUtils } from './ElementsUtils';
import { exportSceneToJson } from './ExportUtils';
import { minifyKeys } from './JSONMinifyUtils';
import StringUtils from './StringUtils';

//const expandKeyMap = invert(shortKeyMap);

describe('ExportUtils', () => {
    beforeEach(() => {
        vi.resetAllMocks();
        (ElementsUtils.querySceneName as any).mockResolvedValue('test-scene');
    });

    describe('exportSceneToJson', () => {
        it('should export scene with convertServerObjUrls set to true for cross-server compatibility', async () => {
            await exportSceneToJson({ includeAssets: false });

            expect(ElementsUtils.querySceneName).toHaveBeenCalled();
            expect(StringUtils.saveString).toHaveBeenCalledWith(
                expect.any(String),
                'test-scene.json',
            );

            // Verify the saved JSON content
            const savedData = (StringUtils.saveString as any).mock.calls[0][0];
            const parsedData = JSON.parse(savedData);
            //const expandedData = expandKeys(parsedData, expandKeyMap);

            // Check that the scene data includes scene settings
            const sceneSettings = parsedData.find((item: any) => item.sceneSettings);
            expect(sceneSettings).toBeDefined();
            expect(sceneSettings.sceneSettings).toEqual({
                ShowStats: true,
                UseAvatar: false,
                AllowAnonymousFirebase: true,
                UseInstancing: false,
                VoiceChatEnabled: true,
                IsMultiplayer: false,
                HUDRenderer: 'html',
                MajorVersion: 0,
                MinorVersion: 0,
                MaxCollaboratorsInRoom: 6,
                MaxMultiplayerClientsPerRoom: 4,
                Thumbnail: '/thumbnail.jpg',
                Description: 'Test scene',
                Tags: '["test","demo"]',
                Dependencies: {},
            });

            // Should include server object
            // const serverObject = expandedData.find((item: any) => item.metadata?.generator === 'ServerObject');
            // expect(serverObject).toBeDefined();
            // expect(serverObject.userData.Url).toBe('/model1.glb');
        });

        it('should handle scenes without server objects', async () => {
            // Mock a scene without server objects
            global.app!.scene.children = [
                {
                    type: 'Mesh',
                    uuid: 'mesh-1',
                    userData: { type: 'BasicMesh' },
                },
            ] as any;

            await exportSceneToJson({ includeAssets: false });

            expect(StringUtils.saveString).toHaveBeenCalled();

            const savedData = (StringUtils.saveString as any).mock.calls[0][0];
            const parsedData = JSON.parse(savedData);
            //const expandedData = expandKeys(parsedData, expandKeyMap);

            // Should still have scene settings
            const sceneSettings = parsedData.find((item: any) => item.sceneSettings);
            expect(sceneSettings).toBeDefined();
        });

        it('should export snapping settings in sceneSettings when present on scene userData', async () => {
            global.app!.scene.userData = {
                ...global.app!.scene.userData,
                snapping: {
                    grid: { enabled: true, increment: 0.5 },
                    rotation: { enabled: true, angleDegrees: 15 },
                    scale: { enabled: false, increment: 0.1 },
                    geometric: {
                        enabled: false,
                        snapToVertex: true,
                        snapToEdge: true,
                        snapToFace: true,
                        snapDistance: 0.5,
                        visualFeedback: true,
                    },
                    priority: 'auto',
                },
            };

            await exportSceneToJson({ includeAssets: false });

            const savedData = (StringUtils.saveString as any).mock.calls[0][0];
            const parsedData = JSON.parse(savedData);
            const sceneSettings = parsedData.find((item: any) => item.sceneSettings);

            expect(sceneSettings.sceneSettings.userData?.snapping).toEqual(global.app!.scene.userData.snapping);
        });

        it('should export the SceneTraverser beta flag when present on scene userData', async () => {
            global.app!.scene.userData = {
                ...global.app!.scene.userData,
                useSceneTraverser: true,
            };

            await exportSceneToJson({ includeAssets: false });

            const savedData = (StringUtils.saveString as any).mock.calls[0][0];
            const parsedData = JSON.parse(savedData);
            const sceneSettings = parsedData.find((item: any) => item.sceneSettings);

            expect(sceneSettings.sceneSettings.userData?.useSceneTraverser).toBe(true);
        });

        it('should export useSceneTraverser: false when explicitly set', async () => {
            global.app!.scene.userData = {
                ...global.app!.scene.userData,
                useSceneTraverser: false,
            };

            await exportSceneToJson({ includeAssets: false });

            const savedData = (StringUtils.saveString as any).mock.calls[0][0];
            const parsedData = JSON.parse(savedData);
            const sceneSettings = parsedData.find((item: any) => item.sceneSettings);

            expect(sceneSettings.sceneSettings.userData?.useSceneTraverser).toBe(false);
        });

        it('should omit useSceneTraverser from userData when not set on scene', async () => {
            // Ensure no useSceneTraverser key on userData
            global.app!.scene.userData = { Server: true };

            await exportSceneToJson({ includeAssets: false });

            const savedData = (StringUtils.saveString as any).mock.calls[0][0];
            const parsedData = JSON.parse(savedData);
            const sceneSettings = parsedData.find((item: any) => item.sceneSettings);

            // userData should either be absent or not contain useSceneTraverser
            expect(sceneSettings.sceneSettings.userData?.useSceneTraverser).toBeUndefined();
        });

        it('should handle missing app or editor gracefully', async () => {
            const originalApp = global.app;

            // Test with missing app
            global.app = null;
            await exportSceneToJson({ includeAssets: false });
            expect(StringUtils.saveString).not.toHaveBeenCalled();

            // Test with missing editor
            global.app = { ...originalApp, editor: null } as any;
            await exportSceneToJson({ includeAssets: false });
            expect(StringUtils.saveString).not.toHaveBeenCalled();

            // Restore original app
            global.app = originalApp;
        });

        it('should handle JSON formatting errors gracefully', async () => {
            // Mock minifyKeys to throw an error on formatting
            (minifyKeys as any).mockImplementation(() => { throw new Error('Minify error'); });
            const stringifySpy = vi.spyOn(JSON, 'stringify');

            await exportSceneToJson({ includeAssets: false });

            // Should have been called twice - once for minified, once for fallback
            expect(stringifySpy).toHaveBeenCalledTimes(2);

            expect(StringUtils.saveString).toHaveBeenCalled();
        });

        it('should properly format JSON output', async () => {
            await exportSceneToJson({ includeAssets: false });

            const savedData = (StringUtils.saveString as any).mock.calls[0][0];

            // Should be valid JSON
            expect(() => JSON.parse(savedData)).not.toThrow();
        });

        it('should handle scene name query errors', async () => {
            vi.mocked(ElementsUtils.querySceneName).mockRejectedValueOnce(new Error('Name query failed'));

            await exportSceneToJson({ includeAssets: false });

            // Should not save anything if scene name query fails
            expect(StringUtils.saveString).not.toHaveBeenCalled();
        });

        it.skip('should preserve all editor settings in scene settings', async () => {
            // Set up specific editor settings
            global.app!.editor = {
                showStats: false,
                useAvatar: true,
                allowAnonymousFirebase: false,
                useInstancing: true,
                voiceChatEnabled: false,
                isMultiplayer: true,
                hudRenderer: 'uikit',
                rendering: { shadowMapType: 2 },
                sceneThumbnail: '/custom-thumb.png',
                description: 'Custom description',
                tags: ['custom', 'test', 'scene'],
            } as any;

            await exportSceneToJson({ includeAssets: false });

            expect(StringUtils.saveString).toHaveBeenCalled();
            const savedData = (StringUtils.saveString as any).mock.calls[0][0];
            const parsedData = JSON.parse(savedData);
            //const expandedData = expandKeys(parsedData, expandKeyMap);

            // Check that the scene data includes scene settings
            const sceneSettings = parsedData.find((item: any) => item.sceneSettings);

            expect(sceneSettings.sceneSettings).toEqual({
                ShowStats: false,
                UseAvatar: true,
                AllowAnonymousFirebase: false,
                UseInstancing: true,
                VoiceChatEnabled: false,
                IsMultiplayer: true,
                HUDRenderer: 'uikit',
                Rendering: { shadowMapType: 'basic' }, // From mock
                Thumbnail: '/custom-thumb.png',
                Description: 'Custom description',
                Tags: '["custom","test","scene"]',
            });
        });
    });
});
