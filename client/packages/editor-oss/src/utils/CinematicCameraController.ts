import * as THREE from "three";

export interface CinematicStep {
    from?: THREE.Vector3;
    to: THREE.Vector3;
    lookAt?: THREE.Vector3;
    lookAtFrom?: THREE.Vector3;
    lookAtTo?: THREE.Vector3;
    duration: number;
    wait?: number;
}

export interface CinematicConfig {
    camera: THREE.Camera;
    steps: CinematicStep[];
    loop?: boolean;
    onComplete?: () => void;
    onStepComplete?: (stepIndex: number) => void;
}

export interface CinematicCameraController {
    play(): void;
    stop(): void;
    update(dt: number): void;
    isPlaying(): boolean;
}

// Pre-allocated temp objects to avoid per-frame GC
const _tempVec3 = new THREE.Vector3();
const _tempQuatTo = new THREE.Quaternion();
const _tempLookMatrix = new THREE.Matrix4();

/**
 *
 * @param t
 */
function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
}

/**
 *
 * @param config
 */
export function createCinematicCameraController(config: CinematicConfig): CinematicCameraController {
    const { camera, steps, loop = false, onComplete, onStepComplete } = config;

    let playing = false;
    let currentStepIndex = 0;
    let stepElapsed = 0;
    let waitElapsed = 0;
    let isWaiting = false;

    /**
     *
     * @param step
     * @param t
     */
    function applyStep(step: CinematicStep, t: number): void {
        const smooth = smoothstep(Math.min(1, Math.max(0, t)));

        // Interpolate position
        const from = step.from ?? camera.position;
        _tempVec3.lerpVectors(from, step.to, smooth);
        camera.position.copy(_tempVec3);

        // Interpolate look target
        if (step.lookAtFrom && step.lookAtTo) {
            // Animated look target: slerp between two orientations
            _tempVec3.lerpVectors(step.lookAtFrom, step.lookAtTo, smooth);

            _tempLookMatrix.lookAt(camera.position, _tempVec3, camera.up);
            _tempQuatTo.setFromRotationMatrix(_tempLookMatrix);
            camera.quaternion.copy(_tempQuatTo);
        } else if (step.lookAt) {
            // Static look target
            _tempLookMatrix.lookAt(camera.position, step.lookAt, camera.up);
            _tempQuatTo.setFromRotationMatrix(_tempLookMatrix);
            camera.quaternion.copy(_tempQuatTo);
        }
    }

    return {
        play(): void {
            playing = true;
            currentStepIndex = 0;
            stepElapsed = 0;
            waitElapsed = 0;
            isWaiting = false;
        },

        stop(): void {
            playing = false;
        },

        isPlaying(): boolean {
            return playing;
        },

        update(dt: number): void {
            if (!playing || steps.length === 0) return;

            const step = steps[currentStepIndex]!;

            if (isWaiting) {
                waitElapsed += dt;
                if (waitElapsed >= (step.wait ?? 0)) {
                    isWaiting = false;
                    onStepComplete?.(currentStepIndex);
                    currentStepIndex++;

                    if (currentStepIndex >= steps.length) {
                        if (loop) {
                            currentStepIndex = 0;
                        } else {
                            playing = false;
                            onComplete?.();
                            return;
                        }
                    }

                    stepElapsed = 0;
                    waitElapsed = 0;
                }
                return;
            }

            stepElapsed += dt;
            const t = step.duration > 0 ? stepElapsed / step.duration : 1;

            applyStep(step, t);

            if (t >= 1) {
                applyStep(step, 1);

                if (step.wait && step.wait > 0) {
                    isWaiting = true;
                    waitElapsed = 0;
                } else {
                    onStepComplete?.(currentStepIndex);
                    currentStepIndex++;

                    if (currentStepIndex >= steps.length) {
                        if (loop) {
                            currentStepIndex = 0;
                        } else {
                            playing = false;
                            onComplete?.();
                            return;
                        }
                    }

                    stepElapsed = 0;
                }
            }
        },
    };
}
