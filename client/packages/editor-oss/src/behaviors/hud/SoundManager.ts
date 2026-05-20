import * as THREE from "three";

import {ISoundSettings} from "@stem/editor-oss/types/editor";

class SoundManager {
    scene: THREE.Scene | null = null;
    audioListener: THREE.AudioListener | null = null;
    loadedSounds: Record<string, any> = {};
    totalSounds: number = -1;
    currentlyPlayingSoundId: string | null = null;
    private activeSounds: Record<string, THREE.Audio> = {};

    constructor(scene: THREE.Scene | null) {
        this.scene = scene;
        this.audioListener = null;
        this.loadedSounds = {};
        this.clearLoadedSounds();
        this.audioListener = new THREE.AudioListener();
    }

    // Method to clear loaded sounds
    clearLoadedSounds() {
        for (const id in this.loadedSounds) {
            if (Object.prototype.hasOwnProperty.call(this.loadedSounds, id)) {
                const sound = this.loadedSounds[id];
                if (sound.isPlaying) sound.stop();
                if (sound.source) sound.source.disconnect();
                if (sound.buffer) sound.buffer = null;
                delete this.loadedSounds[id];
            }
        }
    }

    stopAllSounds() {
        Object.keys(this.activeSounds).forEach(id => {
            const sound = this.activeSounds[id];
            if (sound && sound.isPlaying) {
                sound.stop();
                console.log(`Force stopped sound: ${id}`);
            }
        });
        this.activeSounds = {};
    }

    stopSound(id: string) {
        if (!this.loadedSounds || !this.loadedSounds[id]) {
            console.warn(`Sound with ID "${id}" not found or already removed.`);
            return;
        }
        this.loadedSounds[id].stop();
    }

    loadSounds(soundSettings: ISoundSettings[]) {
        const audioLoader = new THREE.AudioLoader();

        soundSettings.forEach((setting: ISoundSettings) => {
            audioLoader.load(
                setting.url,
                buffer => {
                    const sound = new THREE.Audio(this.audioListener!);
                    sound.setBuffer(buffer);

                    sound.setLoop(setting.loop);
                    sound.setVolume(setting.volume * 0.5);

                    this.loadedSounds[setting.id] = sound;
                    console.log(`Loaded sound with ID "${setting.id}"`);

                    if (Object.keys(this.loadedSounds).length === this.totalSounds) {
                        this.onAllSoundsLoaded();
                    }

                    // Play the "background" sound once it's loaded
                    if (setting.soundType === "play-now" || setting.soundType === "menu-background") {
                        this.playSound(setting.id, setting.soundType);
                    }
                    if (setting.soundType === "play-preview") {
                        this.playSoundPreview(setting.id);
                    }
                },
                xhr => {
                    console.log(xhr.loaded / xhr.total * 100 + "% loaded");
                },
                error => {
                    console.error("Failed to load audio file:", error);
                },
            );
        });
    }

    onAllSoundsLoaded() {
        console.log("All sounds have been loaded.");
    }

    async playSoundPreview(id: string) {
        this.stopAllSounds();

        const sound = this.loadedSounds[id];
        if (!sound) {
            console.error(`Sound with ID "${id}" not found.`);
            return;
        }

        this.activeSounds[id] = sound;
        sound.play();
    }

    playSound(id: string, type?: string) {
        const sound = this.loadedSounds[id];
        if (sound) {
            if (type === "play-now" || type === "jump" || type === "menu-background") {
                sound.setVolume(0.5);
            } else {
                sound.stop();
                sound.setVolume(1.5);
            }

            sound.play();
        } else {
            console.error(`Sound with ID "${id}" not found.`);
        }
    }

    setVolume(id: string, volume: number) {
        const sound = this.loadedSounds[id];
        if (sound) {
            sound.setVolume(volume);
        } else {
            console.error(`Sound with ID "${id}" not found.`);
        }
    }

    muteAllSounds() {
        for (const id in this.loadedSounds) {
            if (Object.prototype.hasOwnProperty.call(this.loadedSounds, id)) {
                this.loadedSounds[id].setVolume(0);
            }
        }
    }
}

export {SoundManager};
