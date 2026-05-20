import {AnimationClip, AnimationMixer, AnimationAction, MathUtils, LoopRepeat, LoopOnce} from "three";

import {IAnimationState, ITransition,AnimationStatePayload} from "./types";

export class AnimationState implements IAnimationState {
    id: string;
    name: string;
    payload: AnimationStatePayload;
    protected position = {x: 0, y: 0};
    private transitions: ITransition[] = [];
    private isActive: boolean = false;
    private action: AnimationAction | null = null;
    private clip: AnimationClip | null = null;
    private clipInstance: AnimationClip | null = null;
    protected mixer: AnimationMixer | null = null;

    constructor(
        id: string | undefined,
        name: string,
        clip?: AnimationClip | null,
        payload: AnimationStatePayload = {},
    ) {
        this.id = id || MathUtils.generateUUID();
        this.name = name;
        this.payload = payload;
        this.clip = clip ?? null;
    }

    initialize(mixer: AnimationMixer): void {
        this.mixer = mixer;

        if (!this.clip) {
            return;
        }

        this.clipInstance = this.clip.clone();
        this.action = mixer.clipAction(this.clipInstance);

        if (!this.action) {
            return;
        }

        if (this.payload.loop !== undefined) {
            this.action.loop = this.payload.loop ? LoopRepeat : LoopOnce;
        }
        if (this.payload.clampWhenFinished) {
            this.action.clampWhenFinished = true;
        }
        if (this.payload.timeScale !== undefined) {
            this.action.timeScale = this.payload.timeScale;
        }
        if (this.payload.weight !== undefined) {
            this.action.weight = this.payload.weight;
        }
    }

    setPosition(x: number, y: number): void {
        this.position = {x, y};
    }

    getPosition(): {x: number; y: number} | null {
        return this.position;
    }

    enter(fadeInDuration?: number): void {
        this.isActive = true;
        if (this.action) {
            this.action.reset();
            this.action.play();
            if (fadeInDuration) {
                this.action.fadeIn(fadeInDuration);
            }
        }
    }

    exit(fadeOutDuration?: number): void {
        this.isActive = false;
        if (this.action) {
            if (fadeOutDuration) {
                this.action.fadeOut(fadeOutDuration);
            } else {
                this.action.stop();
            }
        }
    }

    addTransition(transition: ITransition): void {
        this.transitions.push(transition);
    }

    getTransitions(): ITransition[] {
        return this.transitions;
    }

    clearTransitions(): void {
        this.transitions = [];
    }

    removeTransition(index: number): ITransition | null {
        if (index >= 0 && index < this.transitions.length) {
            return this.transitions.splice(index, 1)[0] as ITransition;
        }
        return null;
    }

    isStateActive(): boolean {
        return this.isActive;
    }

    getAction(): AnimationAction | null {
        return this.action;
    }

    dispose(): void {
        if (this.action) {
            this.action.stop();
            this.action.reset();
            if (this.mixer && this.clipInstance) {
                this.mixer.uncacheAction(this.clipInstance);
            }
            if (this.mixer && this.clipInstance) {
                this.mixer.uncacheClip(this.clipInstance);
            }
            this.clipInstance = null;
            this.action = null;
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            payload: this.payload,
            transitions: this.transitions.map(t => ({
                toState: t.targetState.id,
                conditions: t.conditions,
                fadeInDuration: t.fadeInDuration,
                fadeOutDuration: t.fadeOutDuration,
                hasExitTime: t.hasExitTime,
                exitTime: t.exitTime,
                fixedDuration: t.fixedDuration,
                offset: t.offset,
                interruptionSource: t.interruptionSource,
                orderedInterruption: t.orderedInterruption,
            })),
            clipName: this.clip?.name,
            position: this.position,
        };
    }

    static fromJSON(data: any, clipMap: Record<string, AnimationClip>, mixer: AnimationMixer): AnimationState {
        let clip: AnimationClip | null = null;
        if (data.clipName) {
            clip = clipMap[data.clipName] || null;
            if (data.id !== "ANY" && !clip) {
                 
                console.warn(`AnimationClip '${data.clipName}' not found; creating state '${data.name}' without clip.`);
            }
        }

        const state = new AnimationState(data.id, data.name, clip, data.payload);
        state.initialize(mixer);

        const pos = data.position;
        state.setPosition(pos.x, pos.y);

        return state;
    }

    public resetToRestPose(): void {
        if (this.action) {
            this.action.reset();
            this.action.time = 0;
        }
        if (this.mixer) {
            this.mixer.update(0);
        }
    }

    /**
     * Sets a new AnimationClip for this state and re-initializes the action if a mixer is present.
     * @param clip
     */
    public setClip(clip: AnimationClip): void {
        this.resetToRestPose();

        if (this.action) {
            this.action.stop();
        }
        if (this.mixer && this.clipInstance) {
            this.mixer.uncacheAction(this.clipInstance);
        }
        if (this.mixer && this.clipInstance) {
            this.mixer.uncacheClip(this.clipInstance);
        }
        this.action = null;
        this.clipInstance = null;

        this.clip = clip;
        if (this.mixer) {
            this.initialize(this.mixer);
        }
        const action = this.action as AnimationAction | null;
        if (action && this.isActive) {
            action.play();
        }
    }
}
