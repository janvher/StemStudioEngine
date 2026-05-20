import * as THREE from "three";

import {
    CinematicCameraController,
    CinematicStep,
    createCinematicCameraController,
} from "@stem/editor-oss/utils/CinematicCameraController";
import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

class CinematicCameraBehavior extends BehaviorBase {
    private controller: CinematicCameraController | null = null;
    private camera: THREE.Camera | null = null;

    init(game: GameManager): void {
        void super.init(game);
        this.camera = game.camera ?? null;
    }

    onStart(): void {
        if (!this.camera) return;

        const stepsRaw = this.getAttribute("steps");
        const steps = parseSteps(stepsRaw);
        if (steps.length === 0) return;

        this.controller = createCinematicCameraController({
            camera: this.camera,
            steps,
            loop: this.getAttribute("loop") ?? false,
        });

        if (this.getAttribute("autoPlay")) {
            this.controller.play();
        }
    }

    update(deltaTime: number): void {
        this.controller?.update(deltaTime);
    }

    onEvent(msg: string): void {
        if (!this.controller) return;
        if (msg === "play") {
            this.controller.play();
        } else if (msg === "stop") {
            this.controller.stop();
        }
    }

    dispose(): void {
        this.controller?.stop();
        this.controller = null;
        this.camera = null;
        super.dispose();
    }
}

/**
 *
 * @param raw
 */
function parseSteps(raw: unknown): CinematicStep[] {
    if (!raw) return [];

    let data: any[];
    if (typeof raw === "string") {
        try {
            data = JSON.parse(raw);
        } catch {
            return [];
        }
    } else if (Array.isArray(raw)) {
        data = raw;
    } else {
        return [];
    }

    return data.map((s: any) => ({
        from: s.from ? new THREE.Vector3(s.from.x, s.from.y, s.from.z) : undefined,
        to: new THREE.Vector3(s.to?.x ?? 0, s.to?.y ?? 0, s.to?.z ?? 0),
        lookAt: s.lookAt ? new THREE.Vector3(s.lookAt.x, s.lookAt.y, s.lookAt.z) : undefined,
        lookAtFrom: s.lookAtFrom ? new THREE.Vector3(s.lookAtFrom.x, s.lookAtFrom.y, s.lookAtFrom.z) : undefined,
        lookAtTo: s.lookAtTo ? new THREE.Vector3(s.lookAtTo.x, s.lookAtTo.y, s.lookAtTo.z) : undefined,
        duration: s.duration ?? 2,
        wait: s.wait ?? 0,
    }));
}

export default CinematicCameraBehavior;
