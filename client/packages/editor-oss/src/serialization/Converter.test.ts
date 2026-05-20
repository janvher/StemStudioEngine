vi.mock('three', async (importOriginal) => {
    const actual = await importOriginal<typeof import('three')>();
    return {
        ...actual,
        Audio: vi.fn(),
        AudioListener: vi.fn(),
    };
});

vi.mock('../assets/js/loaders/ModelLoader', () => ({
    default: vi.fn(),
}));

vi.mock('../global', () => ({
    default: {
        app: {
            call: vi.fn(),
        },
    },
}));

import { Object3D, PerspectiveCamera, Scene } from 'three';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import Converter from './Converter';
import ModelLoader from '../assets/js/loaders/ModelLoader';

const makeServerObject = () => {
    const obj = new Object3D();
    obj.userData.Server = true;
    obj.userData.Url = '/model1.glb';
    return obj;
};

const makeScene = () => {
    const scene = new Scene();
    scene.name = "ConverterTestScene";
    scene.add(makeServerObject());
    return scene;
};

describe('Converter', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    describe('toJSON', () => {
        // Test absolute / relative URL handling
        [
            {
                convertServerObjUrls: true,
                originalUrl: '/model1.glb',
                expectedUrl: 'https://mocked.com/model1.glb',
            },
            {
                convertServerObjUrls: false,
                originalUrl: '/model1.glb',
                expectedUrl: '/model1.glb',
            },
            {
                convertServerObjUrls: true,
                originalUrl: 'https://mocked.com/model1.glb',
                expectedUrl: 'https://mocked.com/model1.glb',
            },
            {
                convertServerObjUrls: false,
                originalUrl: 'https://mocked.com/model1.glb',
                expectedUrl: '/model1.glb',
            },
        ].forEach(({ convertServerObjUrls, originalUrl, expectedUrl }) => {
            it(`should convert ${originalUrl} to ${expectedUrl} with convertServerObjUrls=${convertServerObjUrls}`, () => {
                vi.stubGlobal('location', {
                    origin: 'https://mocked.com',
                });

                const scene = makeScene();
                scene.children[0]!.userData.Url = originalUrl;

                const output = new Converter(undefined, convertServerObjUrls).toJSON({
                    options: {},
                    camera: new PerspectiveCamera(),
                    scripts: [],
                    scene: makeScene(),
                });

                // Find server objects in the exported data
                const serverObjects = output.filter((item: any) =>
                    item.metadata?.generator === 'ServerObject' && item.userData?.Server,
                );

                expect(serverObjects).toHaveLength(1);
                expect(serverObjects[0].userData.Url.toString()).toEqual(expectedUrl);
            });
        });
    });

    describe('fromJson', () => {
        // Test absolute / relative URL handling
        // fromJson always converts to relative URLs
        [
            {
                server: 'https://other.com',
                originalUrl: '/model1.glb',
                expectedUrl: '/model1.glb',
            },
            {
                server: 'https://other.com',
                originalUrl: 'https://mocked.com/model1.glb',
                expectedUrl: '/model1.glb',
            },
        ].forEach(({ server, originalUrl, expectedUrl }) => {
            it(`should convert ${originalUrl} to ${expectedUrl} with server=${server}`, () => {
                vi.stubGlobal('location', {
                    origin: 'https://mocked.com',
                    host: 'mocked.com',
                });

                const json = [
                    {
                        metadata: { generator: 'OptionsSerializer' },
                        server,
                    },
                    {
                        metadata: { generator: 'SceneSerializer' },
                        userData: {},
                        uuid: 'scene-1',
                    },
                    {
                        metadata: { generator: 'ServerObject' },
                        userData: {
                            Server: true,
                            Url: originalUrl,
                        },
                        uuid: 'mesh-1',
                        parent: 'scene-1',
                    },
                ];

                const options = {
                    camera: new PerspectiveCamera(),
                    scripts: [],
                    server,
                    domWidth: 100,
                    domHeight: 100,
                    assetResolutionContext: {},
                    assetLoader: undefined,
                };

                const mockLoad = vi.fn().mockResolvedValue(new Object3D());
                (ModelLoader as any).mockImplementation(function() {
                    return {
                        load: mockLoad,
                    };
                });

                new Converter(undefined, true).fromJson(json, options);

                expect(mockLoad.mock.calls[0]?.[0]).toBe(expectedUrl);
            });
        });
    });

    describe('getPhysicsSettings', () => {
        it('returns engine + gravity from SceneSerializer userData.physics', () => {
            const jsons = [
                { metadata: { generator: "OptionsSerializer" } },
                {
                    metadata: { generator: "SceneSerializer" },
                    userData: { physics: { engine: "rapier", gravity: -12 } },
                },
            ];
            expect(Converter.getPhysicsSettings(jsons)).toEqual({
                engine: "rapier",
                gravity: -12,
            });
        });

        it('falls back to legacy userData.game.gravity when physics.gravity is missing', () => {
            const jsons = [
                {
                    metadata: { generator: "SceneSerializer" },
                    userData: { physics: { engine: "ammo" }, game: { gravity: -9.8 } },
                },
            ];
            expect(Converter.getPhysicsSettings(jsons)).toEqual({
                engine: "ammo",
                gravity: -9.8,
            });
        });

        it('returns both undefined when SceneSerializer entry has no physics or game block', () => {
            const jsons = [
                {
                    metadata: { generator: "SceneSerializer" },
                    userData: { lives: 3 },
                },
            ];
            expect(Converter.getPhysicsSettings(jsons)).toEqual({
                engine: undefined,
                gravity: undefined,
            });
        });

        it('returns both undefined when there is no SceneSerializer entry', () => {
            const jsons = [
                { metadata: { generator: "OptionsSerializer" } },
                { metadata: { generator: "CamerasSerializer" } },
            ];
            expect(Converter.getPhysicsSettings(jsons)).toEqual({
                engine: undefined,
                gravity: undefined,
            });
        });

        it('returns both undefined when input is not an array', () => {
            const empty = { engine: undefined, gravity: undefined };
            expect(Converter.getPhysicsSettings(undefined as unknown as unknown[])).toEqual(empty);
            expect(Converter.getPhysicsSettings(null as unknown as unknown[])).toEqual(empty);
            expect(Converter.getPhysicsSettings({} as unknown as unknown[])).toEqual(empty);
        });
    });
});
