import {BehaviorBase} from "../../Behavior";
import GameManager from "../../game/GameManager";

class AnimationBehavior extends BehaviorBase {
    private isStarted: boolean = false;

    init(gameManager: GameManager) {
        this.game = gameManager;
    }

    onPaused(): void {
        this.stopAnimation();
    }

    onResumed(): void {
        if (!this.attributes.startOnTrigger) {
            this.startAnimation();
        }
    }

    onAdded() {
        if (!this.attributes.startOnTrigger) {
            this.startAnimation();
        }
    }

    onRemoved(): void {
        this.stopAnimation();
    }

    onReset() {}

    onEvent(msg: string, data: any): void {
        if (msg === "trigger") {
            if (data.actionType === "activate" && !this.isStarted) {
                this.startAnimation();
            } else if (data.actionType === "deactivate" && this.isStarted) {
                this.stopAnimation();
            }
        }
    }

    onAttributesUpdated(): void {
        if (this.isStarted) {
            this.stopAnimation();
            this.startAnimation();
        }
    }

    private startAnimation = () => {
        if (this.isStarted) {
            console.warn("Animation is already started.");
            return;
        }

        this.isStarted = true;

        if (!this.game || !this.game.scene) {
            console.warn("GameManager or scene is not initialized properly.");
            return;
        }

        const selectedAnimation = this.attributes.animation;
        const animationSpeed = this.attributes.speed ?? 1.0;
        const loop = this.attributes.loop ?? true;

        if (selectedAnimation) {
            this.game?.animationController?.playAnimation(this.target, selectedAnimation, animationSpeed, !loop);
        }
    };

    private stopAnimation() {
        if (!this.isStarted) {
            console.warn("Animation is not started.");
            return;
        }
        this.isStarted = false;
        this.game!.animationController?.stopAnimation(this.target);
    }
}

export default AnimationBehavior;
