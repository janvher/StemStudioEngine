import * as THREE from "three";

import DayNightCycle from "./DayNightCycle";
import Editor from "@stem/editor-oss/editor/Editor";
import CameraUtils from "@stem/editor-oss/utils/CameraUtils";
import {BehaviorBase} from "../../Behavior";
import EventBus, {BEHAVIOR_EVENTS} from "../../event/EventBus";
import GameManager from "../../game/GameManager";

class DayNightCycleBehavior extends BehaviorBase {
    game: GameManager | null = null;
    private scene: THREE.Scene | null = null;
    private dayNightCycle?: DayNightCycle;
    private camera: THREE.Camera | null = null;
    private isCycleRetained: boolean = false; // track whether we've retained the shared DayNightCycle

    /**
     * Acquire the singleton instance if not already retained by this behavior.
     * If already present, just update context without increasing ref count again.
     */
    private acquireInstance(): void {
        if (!this.target || !this.scene || !this.camera) {
            console.warn("DayNightCycleBehavior: Target, scene, or camera is not defined.");
            return;
        }

        if (!this.dayNightCycle) {
            this.dayNightCycle = DayNightCycle.getInstance(this.target, this.scene, this.camera);
            this.isCycleRetained = true;
        } else {
            // Update context without bumping ref count
            DayNightCycle.updateContext(this.target, this.scene, this.camera);
        }

        // Ensure sky exists (only create if missing)
        if (!this.dayNightCycle.sky) {
            this.dayNightCycle.createSky();
        }
    }

    /**
     * Apply current attributes to the shared instance without recreating the sky.
     */
    private applyAttributes(): void {
        if (!this.dayNightCycle) return;
        this.dayNightCycle.enableDayNightCycle = !!this.attributes.enableDayNightCycle;
        EventBus.instance.send(BEHAVIOR_EVENTS.DAY_NIGHT_CYCLE, {
            enableDayNightCycle: this.dayNightCycle.enableDayNightCycle,
        });
        if (typeof this.attributes.rotationSpeed === "number") {
            this.dayNightCycle.setRotationSpeed(this.attributes.rotationSpeed);
        }
        if (this.attributes.isPaused !== undefined) {
            if (this.attributes.isPaused) {
                this.dayNightCycle.pauseRotation();
            } else {
                this.dayNightCycle.resumeRotation();
            }
        }
        if (typeof this.attributes.initialTimeHours === "number") {
            this.dayNightCycle.setTimeOfDayFromHours(this.attributes.initialTimeHours);
        }
    }

    init(gameManager: GameManager) {
        this.game = gameManager;
        this.scene = gameManager.scene || null;
        this.camera = gameManager.camera || null;
    }

    onStart(): void {
        if (!this.target) {
            console.warn("DayNightCycleBehavior: Target is not defined.");
            return;
        }
        this.scene = this.game?.scene || null;
        this.camera = this.game?.camera || null;
        this.acquireInstance();
        this.applyAttributes();

        // Default sunrise only if user didn't specify initial hours
        if (this.dayNightCycle && typeof this.attributes.initialTimeHours !== "number") {
            this.dayNightCycle.setTimeOfDay(0.25); // sunrise default
        }

        CameraUtils.disableCameraCollision(this.target);
    }

    update(): void {
        this.dayNightCycle?.update();
    }

    onStop(): void {
        this.removeDayNightCycle();
    }

    onReset(): void {}

    // Editor methods

    onEditorAdded(editor: Editor): void {
        this.scene = editor.scene;
        this.camera = editor.camera;
        this.acquireInstance();
        this.applyAttributes();
        if (this.dayNightCycle && typeof this.attributes.initialTimeHours !== "number") {
            this.dayNightCycle.setTimeOfDay(0.25); // sunrise default in editor
        }
    }

    onEditorRemoved(): void {
        this.removeDayNightCycle();
    }

    onEditorDispose(): void {
        this.removeDayNightCycle();
    }

    onEditorUpdate(): void {
        this.dayNightCycle?.update();
    }

    onEditorAttributesUpdated(): void {
        // Just re-apply attributes; avoid ref count inflation and needless sky recreation
        this.applyAttributes();
    }

    private removeDayNightCycle(): void {
        if (this.isCycleRetained) {
            DayNightCycle.release();
            this.isCycleRetained = false;
        }
        this.dayNightCycle = undefined;
    }

    onEvent(msg: string, data: unknown): void {
        if (!this.dayNightCycle) {
            console.warn("DayNightCycleBehavior: DayNightCycle instance not available for event:", msg);
            return;
        }

        switch (msg) {
            case "daynight:setRotationSpeed":
                if (typeof data === "number" && data >= 0) {
                    this.dayNightCycle.setRotationSpeed(data);
                } else {
                    console.warn("DayNightCycleBehavior: Invalid rotation speed value:", data);
                }
                break;

            case "daynight:pauseRotation":
                this.dayNightCycle.pauseRotation();
                break;

            case "daynight:resumeRotation":
                this.dayNightCycle.resumeRotation();
                break;

            case "daynight:toggleRotation":
                this.dayNightCycle.toggleRotation();
                break;

            case "daynight:setTimeOfDay":
                if (typeof data === "number" && data >= 0 && data <= 1) {
                    this.dayNightCycle.setTimeOfDay(data);
                } else {
                    console.warn("DayNightCycleBehavior: Invalid time of day value (must be 0-1):", data);
                }
                break;

            case "daynight:setTimeOfDayHours":
                if (typeof data === "number" && data >= 0 && data < 24) {
                    this.dayNightCycle.setTimeOfDayFromHours(data);
                } else {
                    console.warn("DayNightCycleBehavior: Invalid hours value (must be 0-23.99):", data);
                }
                break;

            case "daynight:setSunrise":
                this.dayNightCycle.setTimeOfDay(0.25); // 6 AM
                break;

            case "daynight:setSunset":
                this.dayNightCycle.setTimeOfDay(0.75); // 6 PM
                break;

            case "daynight:setNoon":
                this.dayNightCycle.setTimeOfDay(0.5); // 12 PM
                break;

            case "daynight:setMidnight":
                this.dayNightCycle.setTimeOfDay(0); // 12 AM
                break;

            default:
                // Handle unknown events silently
                break;
        }
    }
}

export default DayNightCycleBehavior;
