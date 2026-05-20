import {isAssetRef} from "@stem/editor-oss/asset-management/AssetRef";
import {AudioClipId, AudioController} from "../../../controls/AudioController";
import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

class GenericSoundBehavior extends BehaviorBase {
    private audioController?: AudioController;
    private audioClipId?: AudioClipId;

    init(game: GameManager) {
        this.audioController = game.audioController;
    }

    async onAdded(): Promise<void> {
        let url: string;
        const audioAsset = this.attributes.audioAsset;
        if (audioAsset && isAssetRef(audioAsset)) {
            url = await this.erth.asset.audio.getUrl(audioAsset);
        } else {
            url = String(this.attributes.soundFile);
        }

        if (!url) {
            console.warn("GenericSoundBehavior: No sound file URL provided.");
            return;
        }
        try {
            this.audioClipId = await this.audioController!.loadAudioClip(url);
        } catch (err) {
            console.error(`Failed to load audio file: ${url}`, err);
            return;
        }

        if (this.target) {
            this.audioController!.attachAudioClipToObject(this.audioClipId, this.target);
        }

        this.audioController!.setAudioClipProperties(this.audioClipId, {
            positional: Boolean(this.attributes.positional),
            rolloffFactor: Number(this.attributes.rolloffFactor),
            loop: Boolean(this.attributes.looping),
            volume: Number(this.attributes.volume),
        });

        if (this.attributes.autoPlay) {
            this.audioController!.playAudioClip(this.audioClipId);
        }
    }

    onRemoved(): void {
        this.audioController!.disposeAudioClip(this.audioClipId!);
        this.audioClipId = undefined;
    }

    onAttributesUpdated(): void {
        this.audioController!.setAudioClipProperties(this.audioClipId!, {
            positional: Boolean(this.attributes.positional),
            rolloffFactor: Number(this.attributes.rolloffFactor),
            loop: Boolean(this.attributes.looping),
            volume: Number(this.attributes.volume),
        });
    }

    onReset() {}

    onEvent(msg: string, data: any): void {
        const isPlaying = this.audioController!.isAudioClipPlaying(this.audioClipId!);

        switch (msg) {
            case "trigger":
                if (data.actionType === "activate" && !isPlaying) {
                    this.audioController!.playAudioClip(this.audioClipId!);
                } else if (data.actionType === "deactivate" && isPlaying) {
                    this.audioController!.stopAudioClip(this.audioClipId!);
                }
                break;
            case "sound:play":
                if (!isPlaying) {
                    this.audioController!.playAudioClip(this.audioClipId!);
                }
                break;
            case "sound:stop":
                if (isPlaying) {
                    this.audioController!.stopAudioClip(this.audioClipId!);
                }
                break;
            case "sound:pause":
                if (isPlaying) {
                    this.audioController!.pauseAudioClip(this.audioClipId!);
                }
                break;
            case "sound:resume":
                if (!isPlaying) {
                    this.audioController!.playAudioClip(this.audioClipId!);
                }
                break;
            case "sound:setVolume":
                if (typeof data.volume === "number") {
                    this.audioController!.setAudioClipProperties(this.audioClipId!, {volume: data.volume});
                }
                break;
        }

    }
}

export default GenericSoundBehavior;
