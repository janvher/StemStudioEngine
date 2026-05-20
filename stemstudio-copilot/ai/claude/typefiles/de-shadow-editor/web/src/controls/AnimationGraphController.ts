import { Clock, Object3D , AnimationClip } from 'three';

import { AnimationGraph } from '../animation/AnimationGraph';

// import { AnimationGraph } from './src/animation/AnimationGraph';
import { AnimationState } from '../animation/AnimationState';
import { BlendTreeState } from '../animation/BlendTreeState';
import GameManager from '../behaviors/game/GameManager';

window.AnimationGraph = AnimationGraph;
window.AnimationState = AnimationState;
window.BlendTreeState = BlendTreeState;

export type AnimationGraphData = {
    graph: AnimationGraph;
    object: Object3D;
};

export class AnimationGraphController {
    game?: GameManager | null;
    graphs: AnimationGraphData[];
    clock?: Clock;
    gameStarted: boolean = false;
    private frameCount = 0;

    constructor() {
        this.graphs = [];
        this.clock = new Clock();
    }

    start = (gameManager: GameManager) => {
        this.game = gameManager;
        // Optionally listen to game events
    };

    addGraph = (
        object: Object3D,
        serializedGraph: string,
    ) => {
        const animations =
            (object as any)._obj?.animations.length > 0
                ? ((object as any)._obj.animations as AnimationClip[])
                : object.animations;

        const clipMap: Record<string, AnimationClip> = {};
        for (const clip of animations) {
            if (clip && clip.name) {
                clipMap[clip.name] = clip;
            }
        }

        const graph = new AnimationGraph(object);
        graph.fromJSON(serializedGraph, clipMap);
        this.graphs.push({ object, graph });

        return graph;
    };

    playGraphState = (object: Object3D, stateId: string, fadeIn: number = 0.2, fadeOut: number = 0.2) => {
        for (let i = 0; i < this.graphs.length; i++) {
            if (this.graphs[i].object.uuid === object.uuid) {
                this.graphs[i].graph.setState(stateId, fadeIn, fadeOut);
                break;
            }
        }
    };

    setParameter = (object: Object3D, name: string, value: number | boolean) => {
        for (let i = 0; i < this.graphs.length; i++) {
            if (this.graphs[i].object.uuid === object.uuid) {
                this.graphs[i].graph.setParameter(name, value);
                break;
            }
        }
    };

    stopGraph = (object: Object3D) => {
        // Optionally implement logic to stop all actions in the graph
        // For now, just remove the graph
        for (let i = 0; i < this.graphs.length; i++) {
            if (this.graphs[i].object.uuid === object.uuid) {
                this.graphs.splice(i, 1);
                break;
            }
        }
    };

    update = (clock: Clock, delta?: number) => {
        const dt = delta ?? clock?.getDelta() ?? 0;
        this.frameCount++;
        const camera = this.game?.camera;

        for (let i = 0; i < this.graphs.length; i++) {
            const obj = this.graphs[i].object;
            if (camera && obj.matrixWorld) {
                const skip = this.getSkipFrames(obj, camera);
                if (skip > 0) {
                    let hash = obj.userData._animHash as number | undefined;
                    if (hash === undefined) {
                        hash = this.stableHash(obj.uuid);
                        obj.userData._animHash = hash;
                    }
                    if ((this.frameCount + hash) % (skip + 1) !== 0) continue;
                }
            }
            this.graphs[i].graph.update(dt);
        }
    };

    private getSkipFrames(obj: Object3D, camera: { matrixWorld: { elements: number[] } }): number {
        const e = obj.matrixWorld.elements;
        const ce = camera.matrixWorld.elements;
        const dx = e[12] - ce[12], dy = e[13] - ce[13], dz = e[14] - ce[14];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > 10000) return 4;
        if (distSq > 2500) return 1;
        return 0;
    }

    private stableHash(uuid: string): number {
        let h = 0;
        for (let i = 0; i < uuid.length; i++) {
            h = (h << 5) - h + uuid.charCodeAt(i) | 0;
        }
        return Math.abs(h);
    }

    dispose = () => {
        this.graphs = [];
    };
}

export default AnimationGraphController; 
