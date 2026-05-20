import * as THREE from "three";

import GameManager from "../behaviors/game/GameManager";
import global from "../global";

export type BlendedAnimationParams = {
    name: string | THREE.AnimationClip;
    weight?: number;
    speed?: number;
    fadeDuration?: number;
};

export type StoredAnimationData = {
    mixer: THREE.AnimationMixer;
    speed: number;
    actions: THREE.AnimationAction[];
    blends: BlendedAnimationParams[];
    paused: boolean;
    onComplete?: () => void;
    //DEPRECATED: for backward compatibility only
    clip?: THREE.AnimationClip;
    action?: THREE.AnimationAction;
};

export class AnimationController {
    game?: GameManager | null;
    animations: StoredAnimationData[];
    requestAnimationFrameId: number;
    clock?: THREE.Clock;
    gameStarted: boolean = false;
    private frameCount = 0;

    constructor() {
        this.animations = [];
        this.requestAnimationFrameId = -1;
        this.clock = new THREE.Clock();
    }

    start = (gameManager: GameManager) => {
        this.game = gameManager;
        global.app?.on("gameStarted.AnimationController", () => {
            this.gameStarted = true;
        });
    };

    playAnimation = (
        object: THREE.Object3D,
        animationName: string,
        speed: number,
        playOnce?: boolean,
        fadeDuration: number = 0.5,
        onComplete?: () => void,
    ) => {
        this.playBlendedAnimations(
            object,
            [{name: animationName, speed: speed, fadeDuration: fadeDuration}],
            playOnce,
            onComplete,
        );
    };

    playCustomAnimation = (
        object: THREE.Object3D,
        clip: THREE.AnimationClip,
        speed: number,
        playOnce?: boolean,
        fadeDuration: number = 0.5,
    ) => {
        this.playBlendedAnimations(object, [{name: clip, speed: speed, fadeDuration: fadeDuration}], playOnce);
    };

    getMixer = (object: THREE.Object3D): THREE.AnimationMixer => {
        const animation = AnimationController.getStoredAnimationData(object);
        if (animation) {
            return animation.mixer;
        }
        return new THREE.AnimationMixer(object);
    };

    private static getCurrentAnimation(object: THREE.Object3D): StoredAnimationData {
        // TODO: probably better to not expose StoredAnimationData publicly
        // since it may contain private fields
        // TODO: should this be object.userData.animation? (no 's')
        return object.userData.animation as StoredAnimationData;
    }

    static getCurrentAnimationParams(object: THREE.Object3D): BlendedAnimationParams[] | undefined {
        // TODO: should this be object.userData.animation? (no 's')
        const animation = object.userData.animation as StoredAnimationData;
        return animation ? animation.blends : undefined;
    }

    stopAnimation = (object: THREE.Object3D) => {
        const animation = AnimationController.getStoredAnimationData(object);
        if (animation?.mixer) {
            animation.mixer.stopAllAction();
            animation.mixer.uncacheRoot(animation.mixer.getRoot());
        }
        delete object.userData.animation;
    };

    setAnimationPaused = (object: THREE.Object3D, paused: boolean) => {
        const animation = AnimationController.getStoredAnimationData(object);
        if (animation) {
            animation.paused = paused;
        }
    };

    update = () => {
        if (!this.game || !this.game.isGameStarted()) {
            return;
        }

        const delta = this.clock?.getDelta() || 0;
        this.frameCount++;
        const camera = this.game.camera;

        if (this.animations.length > 0) {
            this.animations.forEach(animation => {
                if (animation && !animation.paused) {
                    if (camera) {
                        const skip = this.getSkipFrames(animation.mixer.getRoot(), camera);
                        if (skip > 0) {
                            let hash = (animation.mixer.getRoot() as THREE.Object3D).userData._animHash as number | undefined;
                            if (hash === undefined) {
                                hash = this.stableHash((animation.mixer.getRoot() as THREE.Object3D).uuid);
                                (animation.mixer.getRoot() as THREE.Object3D).userData._animHash = hash;
                            }
                            if ((this.frameCount + hash) % (skip + 1) !== 0) return;
                        }
                    }
                    animation.mixer.update(delta * animation.speed);
                }
            });
        }
    };

    private getSkipFrames(root: THREE.Object3D | THREE.AnimationObjectGroup, camera: THREE.Camera): number {
        const obj = root as THREE.Object3D;
        if (!obj.matrixWorld) return 0;
        const e = obj.matrixWorld.elements;
        const ce = camera.matrixWorld.elements;
        const dx = e[12] - ce[12], dy = e[13] - ce[13], dz = e[14] - ce[14];
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq > 10000) return 4;  // >100m: update every 5th frame
        if (distSq > 2500) return 1;   // >50m: update every 2nd frame
        return 0;
    }

    private stableHash(uuid: string): number {
        let h = 0;
        for (let i = 0; i < uuid.length; i++) {
            h = (h << 5) - h + uuid.charCodeAt(i) | 0;
        }
        return Math.abs(h);
    }

    stop = () => {
        if (this.requestAnimationFrameId !== -1) {
            cancelAnimationFrame(this.requestAnimationFrameId);
            this.requestAnimationFrameId = -1;
        }
    };

    dispose = () => {
        const scene = this.game?.scene;
        scene?.traverse(object => {
            const animation = AnimationController.getStoredAnimationData(object);
            if (animation) {
                const {mixer} = animation;
                if (mixer) {
                    mixer.stopAllAction();
                    mixer.uncacheRoot(mixer.getRoot());
                }
                delete object.userData.animation;
            }
        });
        this.requestAnimationFrameId = -1;
        global.app?.on("gameStarted.AnimationController", null);
    };

    /**
     * Play and blend multiple animations on an object.
     * @param object The THREE.Object3D to animate
     * @param blends Array of { name, weight, speed, fadeDuration }
     * @param playOnce If true, all actions will play once
     * @param onComplete Optional callback invoked when a non-looping animation finishes
     */
    playBlendedAnimations = (
        object: THREE.Object3D,
        blends: BlendedAnimationParams[],
        playOnce?: boolean,
        onComplete?: () => void,
    ) => {
        if (!object) return;
        const mixer = this.getMixer(object);
        const animations =
            (object as any)._obj?.animations?.length > 0
                ? ((object as any)._obj.animations as THREE.AnimationClip[])
                : object.animations;
        if (!animations || blends.length === 0) return;

        // Track actions to keep
        const activeActions: THREE.AnimationAction[] = [];

        for (let i = 0; i < blends.length; i++) {
            const {name, weight = 1, speed = 1, fadeDuration = 0.5} = blends[i];
            const clip = name instanceof THREE.AnimationClip ? name : animations.find(c => c.name === name);
            if (!clip) {
                if (name && name !== "none") {
                    console.warn(`AnimationController: clip ${name} not found on object ${object.name}`);
                }
                continue;
            }
            const action = mixer.clipAction(clip);
            action.enabled = true;
            action.reset();
            action.setEffectiveWeight(weight);
            action.setEffectiveTimeScale(1);
            action.fadeIn(fadeDuration);
            action.play();
            action.timeScale = speed;
            if (playOnce) {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
            }
            activeActions.push(action);
        }

        // Fade out any other actions not in the blend set
        if (animations && Array.isArray(animations)) {
            for (let i = 0; i < animations.length; i++) {
                const clip = animations[i];
                const action = mixer.existingAction(clip);
                if (action && !activeActions.includes(action)) {
                    action.fadeOut(0.3);
                }
            }
        }

        this.animations = this.animations.filter(anim => {
            const animRoot = anim.mixer.getRoot();
            return animRoot.uuid !== object.uuid;
        });

        // Store the blended animation data for this object
        const animationData: StoredAnimationData = {
            mixer,
            actions: activeActions,
            speed: 1,
            blends: blends,
            paused: false,
            onComplete: onComplete,
            //DEPRECATED: for backward compatibility only
            clip: activeActions.length > 0 ? activeActions[0].getClip() : undefined,
            action: activeActions.length > 0 ? activeActions[0] : undefined,
        };

        // Set up completion callback for non-looping animations
        if (playOnce && onComplete) {
            const finishedHandler = () => {
                mixer.removeEventListener("finished", finishedHandler);
                onComplete();
            };
            mixer.addEventListener("finished", finishedHandler);
        }

        object.userData.animation = animationData;
        this.animations.push(animationData);
    };

    /**
     * Update the weights of currently blended animations on an object.
     * @param object The THREE.Object3D being animated
     * @param weights An object mapping animation names to new weights
     */
    updateBlendedAnimationWeights = (object: THREE.Object3D, weights: {[name: string]: number}) => {
        const animation = AnimationController.getStoredAnimationData(object);
        if (!Array.isArray(animation?.actions)) {
            return;
        }

        const {actions} = animation;
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const name = action.getClip().name;
            if (weights.hasOwnProperty(name)) {
                action.setEffectiveWeight(weights[name]);
            }
        }
        // Optionally update the stored blends for reference
        const storedAnimation = AnimationController.getCurrentAnimation(object);
        if (Array.isArray(storedAnimation.blends)) {
            const blends = storedAnimation.blends;
            for (let i = 0; i < blends.length; i++) {
                const b = blends[i];
                if (typeof b.name === "string" && weights.hasOwnProperty(b.name)) {
                    blends[i] = {...b, weight: weights[b.name]};
                }
            }
            storedAnimation.blends = blends;
        }
    };

    private static getStoredAnimationData(object: THREE.Object3D): StoredAnimationData | undefined {
        return object.userData.animation as StoredAnimationData | undefined;
    }
}
