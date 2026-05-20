/**
 * Module: PlayerSession.ts
 * Purpose: Owns all play-mode subsystems that are created when entering play/sandbox
 * mode and torn down when exiting. Extracted from EngineRuntime to give these
 * subsystems a single cohesive owner.
 */

import type EngineRuntime from "../EngineRuntime";
import GameManager from "../behaviors/game/GameManager";
import {AnimationController} from "../controls/AnimationController";
import {AnimationGraphController} from "../controls/AnimationGraphController";
import {AudioController} from "../controls/AudioController";
import type {Disposable} from "../core/Disposable";
import AiWorldControl from "../player/component/AiWorldControl";
import PlayerAudio from "../player/component/PlayerAudio";
import PlayerEvent from "../player/component/PlayerEvent";
import PlayerPhysics2 from "../player/component/PlayerPhysics2";
import WebVR from "../player/component/WebVR";

export class PlayerSession implements Disposable {
    readonly game: GameManager;
    readonly playerEvent: PlayerEvent;
    readonly aiWorldControl: AiWorldControl;
    readonly animationControl: AnimationController;
    readonly animationGraphControl: AnimationGraphController;
    readonly audioControl: AudioController;
    readonly audio: PlayerAudio;
    readonly physics: PlayerPhysics2;
    readonly webvr: WebVR;

    constructor(engine: EngineRuntime) {
        this.playerEvent = new PlayerEvent(engine);
        this.game = new GameManager(engine);
        this.aiWorldControl = new AiWorldControl(engine);
        this.animationControl = new AnimationController();
        this.animationGraphControl = new AnimationGraphController();
        this.audioControl = new AudioController();
        this.audio = new PlayerAudio(engine);
        this.physics = new PlayerPhysics2(engine);
        this.webvr = new WebVR(engine);
    }

    dispose(): void {
        this.aiWorldControl.dispose();
        this.animationControl.dispose();
        this.animationGraphControl.dispose();
        this.audioControl.dispose();
        this.audio.dispose();
        this.physics.dispose();
        this.webvr.dispose();
        this.game.reset();
        this.playerEvent.dispose();
    }
}
