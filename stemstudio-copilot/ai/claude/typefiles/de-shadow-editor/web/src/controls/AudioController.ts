import { uuid } from "@gltf-transform/core";
import { Audio, AudioListener, AudioLoader, Object3D, PositionalAudio } from "three";

import GameManager from "../behaviors/game/GameManager";
import { resolveAssetUrl } from "../utils/AssetDownloadUtils";

export type AudioClipId = string;

export interface AudioClipProperties {
    positional: boolean;
    loop: boolean;
    volume: number;

    // Positional audio only
    rolloffFactor: number;
}

/**
 * Controller for loading and playing sounds.
 * 
 * @remarks
 * This controller supports both "2D" and "3D" positional audio.
 */
export class AudioController {
    private audioListener: AudioListener | null = null;
    private audioLoader: AudioLoader | null = null;
    private audioClipsById = new Map<string, Audio<AudioNode>>();
    private disposed = false;

    start(gameManager: GameManager): void {
        this.disposed = false;

        // In the future we may want to allow the user to attach the listener
        // to any object they choose. For now we'll keep it simple and always
        // attach it to the camera.
        this.audioListener = new AudioListener();

        // Guard against non-finite camera positions crashing Web Audio API.
        // Three.js AudioListener.updateMatrixWorld() calls linearRampToValueAtTime()
        // with position/orientation extracted from matrixWorld — if any value is
        // NaN or Infinity the browser throws a TypeError that crashes the render loop.
        const origUpdate = AudioListener.prototype.updateMatrixWorld;
        this.audioListener.updateMatrixWorld = function (force?: boolean) {
            try {
                origUpdate.call(this, force);
            } catch {
                // Non-finite camera position — skip audio spatialization this frame.
                // The base Object3D.updateMatrixWorld already ran inside origUpdate,
                // so the matrix chain stays valid for children.
            }
        };

        gameManager.camera?.add(this.audioListener);
        this.audioLoader = new AudioLoader();
    }

    dispose() {
        this.disposed = true;

        for (const audio of this.audioClipsById.values()) {
            audio.stop();
            audio.disconnect();
            audio.removeFromParent();
            audio.buffer = null;
        }

        this.audioClipsById.clear();
        this.audioListener?.removeFromParent();
        this.audioListener = null;
        this.audioLoader = null;
    }

    disposeAudioClip(audioClipId: AudioClipId): void {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
            return;
        }

        audio.stop();
        audio.disconnect();
        audio.removeFromParent();
        audio.buffer = null;
        this.audioClipsById.delete(audioClipId);
    }

    attachAudioClipToObject(audioClipId: AudioClipId, object: Object3D): void {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
            return;
        }

        object.add(audio);
    }

    detachAudioClipFromObject(audioClipId: AudioClipId): void {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
            return;
        }

        audio.removeFromParent();
    }

    /**
     * Load an audio clip from a URL.
     * 
     * @remarks
     * Audio clips are stored uncompressed in memory so should only be used for
     * relatively short audio.
     * 
     * @param urlOrId - The URL to load the clip from, or an asset ID
     * @returns An audio clip ID
     */
    async loadAudioClip(urlOrId: string): Promise<AudioClipId> {
        // Resolve asset ID to download URL if needed
        const resolvedUrl = await resolveAssetUrl(urlOrId, 'audio');
        const audioBuffer = await this.loadAudioBuffer(resolvedUrl);
        // The user can leave Play mode while the audio buffer is still
        // downloading. If dispose() ran during the await, registering the
        // clip would orphan it on the singleton AudioContext and the caller
        // would happily play() it in the editor.
        if (this.disposed || !this.audioListener) {
            throw new Error("AudioController disposed before clip finished loading");
        }
        // TODO: in the future we may want to allow the user to specify whether
        // the clip should be "positional" or not. In that case we'd instantiate
        // a THREE.PositionalAudio.
        const audio = new Audio(this.audioListener);
        audio.setBuffer(audioBuffer);
        const id = uuid();
        this.audioClipsById.set(id, audio);
        return id;
    }

    playAudioClip(audioClipId: AudioClipId): void {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
            return;
        }

        audio.play();
    }

    pauseAudioClip(audioClipId: AudioClipId): void {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
            return;
        }

        audio.pause();
    }

    stopAudioClip(audioClipId: AudioClipId): void {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
            return;
        }

        audio.stop();
    }

    getAudioClipProperties(audioClipId: AudioClipId): AudioClipProperties {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
        }

        return {
            positional: audio instanceof PositionalAudio,
            loop: audio?.getLoop() || false,
            volume: audio?.getVolume() || 0,
            rolloffFactor: audio instanceof PositionalAudio ? audio?.getRolloffFactor() : 1,
        };
    }

    setAudioClipProperties(audioClipId: AudioClipId, properties: Partial<AudioClipProperties>): void {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
            return;
        }

        // If the positional property changes, we need to create a new Audio
        // or PositionalAudio object. We then need to restore the current
        // properties on the new object.
        if (properties.positional !== undefined) {
            const isPositional = audio instanceof PositionalAudio;
            if (isPositional !== properties.positional) {
                const currentProperties = this.getAudioClipProperties(audioClipId);
                const parent = audio.parent;
                const isPlaying = audio.isPlaying;
                const buffer = audio.buffer;

                this.disposeAudioClip(audioClipId);
                const newAudio = properties.positional
                    ? new PositionalAudio(this.audioListener!)
                    : new Audio(this.audioListener!);
                this.audioClipsById.set(audioClipId, newAudio);

                if (buffer) {
                    newAudio.setBuffer(buffer);
                }
                parent?.add(newAudio);

                this.setAudioClipProperties(audioClipId, {
                    ...currentProperties,
                    ...properties,
                });

                if (isPlaying) {
                    newAudio.play();
                }
                
                return;
            }
        }

        if (properties.loop !== undefined) {
            audio.setLoop(properties.loop);
        }

        if (properties.volume !== undefined) {
            audio.setVolume(properties.volume);
        }

        if (properties.rolloffFactor !== undefined && audio instanceof PositionalAudio) {
            audio.setRolloffFactor(properties.rolloffFactor);
        }
    }

    isAudioClipPlaying(audioClipId: AudioClipId): boolean {
        const audio = this.audioClipsById.get(audioClipId);
        if (!audio) {
            console.warn(`No audio clip found with ID "${audioClipId}"`);
        }

        return audio?.isPlaying || false;
    }

    getMasterVolume(): number {
        return this.audioListener!.getMasterVolume();
    }

    setMasterVolume(volume: number): void {
        this.audioListener!.setMasterVolume(volume);
    }

    pauseAll(): void {
        for (const audio of this.audioClipsById.values()) {
            audio.pause();
        }
    }

    stopAll(): void {
        for (const audio of this.audioClipsById.values()) {
            audio.stop();
        }
    }

    update(): void {
    }

    private loadAudioBuffer(url: string): Promise<AudioBuffer> {
        return new Promise((resolve, reject) => {
            this.audioLoader?.load(url, resolve, undefined /* onProgress */, reject);
        });
    }
}
