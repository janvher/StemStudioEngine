import { Audio, Object3D, Camera } from "three";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { AudioController } from "./AudioController";
import GameManager from "@stem/editor-oss/behaviors/game/GameManager";

const mockAudioInstances: Partial<Audio>[] = [];

vi.mock("three", async () => {
    const actual = await vi.importActual("three");
    return {
        ...actual,
        Audio: vi.fn().mockImplementation(function() {
            let loop = false;
            let volume = 1;
            let _isPlaying = false;

            const instance = {
                setBuffer: vi.fn(),
                play: vi.fn().mockImplementation(() => { _isPlaying = true; }),
                pause: vi.fn().mockImplementation(() => { _isPlaying = false; }),
                stop: vi.fn().mockImplementation(() => { _isPlaying = false; }),
                disconnect: vi.fn(),
                removeFromParent: vi.fn(),
                getLoop: vi.fn().mockImplementation(() => loop),
                setLoop: vi.fn().mockImplementation((l: boolean) => { loop = l; }),
                getVolume: vi.fn().mockImplementation(() => volume),
                setVolume: vi.fn().mockImplementation((v: number) => { volume = v; }),
                get isPlaying() {
                    return _isPlaying;
                },
            };

            Object.setPrototypeOf(instance, new Object3D());

            mockAudioInstances.push(instance);

            return instance;
        }),
        AudioListener: vi.fn().mockImplementation(function() {
            let volume = 1;

            const instance = {
                getMasterVolume: vi.fn().mockImplementation(() => volume),
                setMasterVolume: vi.fn().mockImplementation((v: number) => { volume = v; }),
                removeFromParent: vi.fn(),
            };

            Object.setPrototypeOf(instance, new Object3D());

            return instance;
        }),
        AudioLoader: vi.fn().mockImplementation(function() {
            return {
                load: (url: string, onLoad: (buffer: AudioBuffer) => void) => {
                    onLoad({} as AudioBuffer);
                },
            };
        }),
    };
});

describe("AudioController", () => {
    let controller: AudioController;

    beforeEach(() => {
        mockAudioInstances.length = 0;
        vi.clearAllMocks();

        const gameManager = {
            camera: new Camera(),
        } as GameManager;

        controller = new AudioController();
        controller.start(gameManager);
    });

    it("should load an audio clip and play it", async () => {
        const id = await controller.loadAudioClip("test.mp3");
        controller.playAudioClip(id);
        expect(controller.isAudioClipPlaying(id)).toBe(true);
    });

    it("should pause an audio clip", async () => {
        const id = await controller.loadAudioClip("test.mp3");
        controller.playAudioClip(id);
        controller.pauseAudioClip(id);
        expect(controller.isAudioClipPlaying(id)).toBe(false);
    });

    it("should stop an audio clip", async () => {
        const id = await controller.loadAudioClip("test.mp3");
        controller.playAudioClip(id);
        controller.stopAudioClip(id);
        expect(controller.isAudioClipPlaying(id)).toBe(false);
    });

    it("should return default properties for a non-positional clip", async () => {
        const id = await controller.loadAudioClip("test.mp3");
        const props = controller.getAudioClipProperties(id);
        expect(props.positional).toBe(false);
        expect(props.loop).toBe(false);
        expect(props.volume).toBe(1);
        expect(props.rolloffFactor).toBe(1);
    });

    it("should attach and detach audio from an Object3D", async () => {
        const id = await controller.loadAudioClip("test.mp3");
        const object = new Object3D();
        const addSpy = vi.spyOn(object, "add");
        
        controller.attachAudioClipToObject(id, object);
        expect(addSpy).toHaveBeenCalledTimes(1);

        vi.clearAllMocks();
        controller.detachAudioClipFromObject(id);
        expect(mockAudioInstances[0]!.removeFromParent).toHaveBeenCalledTimes(1);
    });

    it("should set master volume", () => {
        controller.setMasterVolume(0.5);
        expect(controller.getMasterVolume()).toBe(0.5);
    });

    it("should pause all clips", async () => {
        const id1 = await controller.loadAudioClip("test1.mp3");
        const id2 = await controller.loadAudioClip("test2.mp3");

        controller.playAudioClip(id1);
        controller.playAudioClip(id2);

        controller.pauseAll();

        expect(controller.isAudioClipPlaying(id1)).toBe(false);
        expect(controller.isAudioClipPlaying(id2)).toBe(false);
    });

    it("should stop all clips", async () => {
        const id1 = await controller.loadAudioClip("test1.mp3");
        const id2 = await controller.loadAudioClip("test2.mp3");

        controller.playAudioClip(id1);
        controller.playAudioClip(id2);

        controller.stopAll();

        expect(controller.isAudioClipPlaying(id1)).toBe(false);
        expect(controller.isAudioClipPlaying(id2)).toBe(false);
    });

    it("should stop audio when the controller is disposed", async () => {
        const id = await controller.loadAudioClip("test.mp3");
        controller.playAudioClip(id);
        controller.dispose();
        expect(controller.isAudioClipPlaying(id)).toBe(false);
    });
});
