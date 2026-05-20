import * as THREE from "three";
import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

import UIKitHUDManager from "./UIKitHUDManager";

// --- Mocks ---

const {
    mockRendererShow,
    mockRendererDispose,
    mockRendererUpdate,
    mockLoadSounds,
    mockClearLoadedSounds,
    mockPlaySound,
    mockStopSound,
} = vi.hoisted(() => ({
    mockRendererShow: vi.fn(),
    mockRendererDispose: vi.fn(),
    mockRendererUpdate: vi.fn(),
    mockLoadSounds: vi.fn(),
    mockClearLoadedSounds: vi.fn(),
    mockPlaySound: vi.fn(),
    mockStopSound: vi.fn(),
}));

vi.mock("./UIKitHUDRenderer", () => ({
    UIKitHUDRenderer: class {
        show = mockRendererShow;
        dispose = mockRendererDispose;
        update = mockRendererUpdate;
    },
}));

vi.mock("../../../global", () => ({
    default: {app: null},
}));

vi.mock("../SoundManager", () => ({
    SoundManager: class {
        loadSounds = mockLoadSounds;
        clearLoadedSounds = mockClearLoadedSounds;
        playSound = mockPlaySound;
        stopSound = mockStopSound;
    },
}));

// --- Helpers ---

function makeScene(): THREE.Scene {
    const scene = new THREE.Scene();
    return scene;
}

function makeGameManager(): any {
    return {
        renderer: {},
        uiCamera: new THREE.PerspectiveCamera(),
        camera: new THREE.PerspectiveCamera(),
        scene: new THREE.Scene(),
    };
}

// --- Tests ---

describe("UIKitHUDManager", () => {
    let scene: THREE.Scene;
    let game: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Stub window for addEventListener/removeEventListener used by popstate handler
        (globalThis as any).window = {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        };
        scene = makeScene();
        game = makeGameManager();
    });

    afterEach(() => {
        delete (globalThis as any).window;
        vi.restoreAllMocks();
    });

    it("constructs without throwing", () => {
        const manager = new UIKitHUDManager(scene, game);
        expect(manager).toBeDefined();
        expect(manager.scene).toBe(scene);
    });

    it("create() initializes renderer and calls show()", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.create();
        expect(mockRendererShow).toHaveBeenCalledWith(false);
    });

    it("create(true) passes emptyHUD flag", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.create(true);
        expect(mockRendererShow).toHaveBeenCalledWith(true);
    });

    it("create() without game reference warns and returns early", () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const manager = new UIKitHUDManager(scene);
        manager.create();
        expect(spy).toHaveBeenCalledWith(expect.stringContaining("No game reference"));
        expect(mockRendererShow).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it("clear() disposes renderer and cleans up sounds", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.create();
        manager.clear();
        expect(mockRendererDispose).toHaveBeenCalled();
        expect(mockClearLoadedSounds).toHaveBeenCalled();
    });

    it("clear() is safe to call without create()", () => {
        const manager = new UIKitHUDManager(scene, game);
        expect(() => manager.clear()).not.toThrow();
    });

    it("loadSounds() delegates to SoundManager", () => {
        const manager = new UIKitHUDManager(scene, game);
        const sounds = [{id: "s1", url: "test.mp3", loop: false, volume: 1, soundType: "play-now" as const}];
        manager.loadSounds(sounds);
        expect(mockLoadSounds).toHaveBeenCalledWith(sounds);
    });

    it("playSound() delegates to SoundManager", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.playSound("s1");
        expect(mockPlaySound).toHaveBeenCalledWith("s1");
    });

    it("stopSound() delegates to SoundManager", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.stopSound("s1");
        expect(mockStopSound).toHaveBeenCalledWith("s1");
    });

    it("clearSounds() delegates to SoundManager", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.clearSounds();
        expect(mockClearLoadedSounds).toHaveBeenCalled();
    });

    it("update() delegates to renderer", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.create();
        manager.update(0.016);
        expect(mockRendererUpdate).toHaveBeenCalledWith(0.016);
    });

    it("create() registers popstate handler", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.create();
        expect((globalThis as any).window.addEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));
    });

    it("clear() removes popstate handler", () => {
        const manager = new UIKitHUDManager(scene, game);
        manager.create();
        manager.clear();
        expect((globalThis as any).window.removeEventListener).toHaveBeenCalledWith("popstate", expect.any(Function));
    });
});
