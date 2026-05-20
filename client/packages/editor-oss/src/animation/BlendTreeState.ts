import {AnimationClip, AnimationMixer, AnimationAction} from "three";

import {AnimationState} from "./AnimationState";
import {IBlendTreeState, BlendTreeConfig, ITransition,AnimationStatePayload} from "./types";


export class BlendTreeState extends AnimationState implements IBlendTreeState {
    private actions: AnimationAction[] = [];
    private blendTree: BlendTreeConfig;
    private currentBlendWeights: number[] = [];
    private clips: AnimationClip[];
    private blendParameters: string[];

    constructor(id: string | undefined, name: string, blendTree: BlendTreeConfig, payload: AnimationStatePayload = {}) {
        const validClips: AnimationClip[] = [];
        const validPositions: number[][] = [];
        for (let i = 0; i < blendTree.clips.length; i++) {
            const clip = blendTree.clips[i];
            if (clip) {
                validClips.push(clip);
                validPositions.push(blendTree.positions[i]!);
            }
        }
        const filteredBlendTree = {...blendTree, clips: validClips, positions: validPositions};
        super(id, name, validClips[0], payload);
        this.blendTree = filteredBlendTree;
        this.clips = validClips;
        this.currentBlendWeights = new Array(validClips.length).fill(0);
        this.blendParameters = filteredBlendTree.parameters || [];
    }

    initialize(mixer: AnimationMixer): void {
        this.actions = this.clips.map(clip => {
            const clipInstance = clip.clone();
            const action = mixer.clipAction(clipInstance);
            action.play();
            action.weight = 0;
            return action;
        });
    }

    updateBlend(inputs: number[]): void {
        if (inputs.length !== this.blendTree.positions[0]!.length) {
            console.warn(
                `Invalid input dimension. Expected ${this.blendTree.positions[0]!.length}, got ${inputs.length}`,
            );
            return;
        }

        const weights = this.calculateBlendWeights(inputs);
        this.currentBlendWeights = weights;

        for (let i = 0; i < this.actions.length; i++) {
            this.actions[i]!.weight = weights[i]!;
        }
    }

    private calculateBlendWeights(inputs: number[]): number[] {
        const weights = new Array(this.blendTree.clips.length).fill(0);

        for (let i = 0; i < this.blendTree.positions.length; i++) {
            const position = this.blendTree.positions[i]!;
            let distance = 0;

            for (let j = 0; j < inputs.length; j++) {
                distance += Math.pow(inputs[j]! - position[j]!, 2);
            }

            weights[i] = 1 / (Math.sqrt(distance) + 0.0001);
        }

        const sum = weights.reduce((a, b) => a + b, 0);
        return weights.map(w => w / sum);
    }

    getBlendWeights(): number[] {
        return this.currentBlendWeights;
    }

    getBlendTreeConfig(): BlendTreeConfig {
        return this.blendTree;
    }

    getActions(): AnimationAction[] {
        return this.actions;
    }

    enter(fadeInDuration?: number): void {
        super.enter(fadeInDuration);
        this.actions.forEach(action => {
            if (!action.isRunning()) {
                action.play();
            }
        });
    }

    exit(fadeOutDuration?: number): void {
        super.exit(fadeOutDuration);

        this.actions.forEach(action => {
            if (fadeOutDuration) {
                action.fadeOut(fadeOutDuration);
            } else {
                action.stop();
            }
        });
    }

    dispose(): void {
        if (this.actions) {
            this.actions.forEach(action => {
                action.stop();
                action.reset();
            });
            this.actions = [];
        }
    }

    getBlendParameters(): string[] {
        return this.blendParameters;
    }

    removeTransition(index: number): ITransition | null {
        return super.removeTransition(index);
    }

    toJSON(): any {
        return {
            id: this.id,
            name: this.name,
            payload: this.payload,
            transitions: this.getTransitions().map(t => ({
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
            blendTree: {
                ...this.blendTree,
                clips: this.blendTree.clips.map(c => c?.name),
            },
            position: this.position,
        };
    }

    static fromJSON(data: any, clipMap: Record<string, AnimationClip>, mixer: AnimationMixer): BlendTreeState {
        const blendTree = {
            ...data.blendTree,
            clips: data.blendTree.clips.map((name: string) => clipMap[name]),
        };
        const state = new BlendTreeState(data.id, data.name, blendTree, data.payload);
        state.initialize(mixer);
        const pos = data.position;
        state.setPosition(pos.x, pos.y);
        return state;
    }

    public resetToRestPose(): void {
        if (this.actions) {
            this.actions.forEach(action => {
                action.reset();
                action.time = 0;
            });
        }
        if (this.mixer) {
            this.mixer.update(0);
        }
    }
}
