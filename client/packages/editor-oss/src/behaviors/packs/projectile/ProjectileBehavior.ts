import * as THREE from "three";

import {createProjectileManager, ProjectileManager} from "@stem/editor-oss/utils/ProjectileManager";
import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

class ProjectileBehavior extends BehaviorBase {
    private manager: ProjectileManager | null = null;
    private scene: THREE.Scene | null = null;

    init(game: GameManager): void {
        void super.init(game);
        this.scene = game.scene ?? null;
    }

    onStart(): void {
        if (!this.scene) return;

        this.manager = createProjectileManager(this.scene);
        this.manager.registerDefinition({
            id: "default",
            speed: this.getAttribute("speed") ?? 20,
            gravity: this.getAttribute("gravity") ?? 0,
            lifetime: this.getAttribute("lifetime") ?? 5,
            spread: this.getAttribute("spread") ?? 0,
            damage: this.getAttribute("damage") ?? 1,
            radius: this.getAttribute("radius") ?? 0.1,
        });
    }

    update(deltaTime: number): void {
        this.manager?.update(deltaTime);
    }

    onEvent(msg: string, data: any): void {
        if (msg === "fire" && this.manager) {
            const origin = data?.origin instanceof THREE.Vector3
                ? data.origin
                : new THREE.Vector3(data?.origin?.x ?? 0, data?.origin?.y ?? 0, data?.origin?.z ?? 0);

            const direction = data?.direction instanceof THREE.Vector3
                ? data.direction
                : new THREE.Vector3(data?.direction?.x ?? 0, data?.direction?.y ?? 0, data?.direction?.z ?? -1);

            this.manager.launch({
                definitionId: data?.definitionId ?? "default",
                origin,
                direction,
                owner: data?.owner ?? this.target,
            });
        }
    }

    dispose(): void {
        this.manager?.dispose();
        this.manager = null;
        this.scene = null;
        super.dispose();
    }
}

export default ProjectileBehavior;
