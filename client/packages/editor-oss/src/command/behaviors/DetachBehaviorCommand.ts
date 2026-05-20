import * as THREE from "three";

import {Behavior} from "../../behaviors/Behavior";
import BehaviorData from "../../behaviors/BehaviorData";
import {CreateBehaviorOptions} from '../../behaviors/BehaviorManager';
import GameManager from "../../behaviors/game/GameManager";
import global from "../../global";
import Command from "../Command";

class DetachBehaviorCommand extends Command {
    private selected: THREE.Object3D | null = null;
    private behaviorUUID: string = "";
    private behaviorData: BehaviorData | null = null;
    private behaviorID: string | undefined = "";
    private game: GameManager | null = null;
    private behavior: Behavior | null = null;

    constructor(selected: THREE.Object3D | null, behaviorUUID: string, behaviorID?: string) {
        super();
        this.selected = selected;
        this.behaviorID = behaviorID;
        this.behaviorUUID = behaviorUUID;
        this.editor = global.app?.editor || null;
        this.game = global.app?.game || null;
    }

    execute(): {message: string; status: "success" | "info" | "error"} {
        if (!this.selected || !this.editor) {
            console.error("DetachBehaviorCommand: No selected object or editor is not initialized.");
            return {
                message: `DetachBehaviorCommand: Execution failed - No selected object or editor is not initialized.`,
                status: "error",
            };
        }

        if (this.behaviorID) {
            this.behaviorUUID = this.editor.behaviorDataManager?.getBehaviorDataById(
                this.selected,
                this.behaviorID,
            )?.uuid;
        }

        if (!this.behaviorUUID) {
            return {
                message: `DetachBehaviorCommand: No behavior UUID provided or found.`,
                status: "error",
            };
        }
        // Use the editor's removeBehaviorFromObject method
        this.behaviorData = this.editor.removeBehaviorFromObject(this.selected, this.behaviorUUID) || null;
        if (!this.behaviorData && !this.editor.isMultiplayer) {
            // In multiplayer mode while CRDT is enabled, the behavior might not be found in the editor but could exist in the game
            console.error(`DetachBehaviorCommand: No behavior data found for UUID: ${this.behaviorUUID}`);
            return {
                message: `DetachBehaviorCommand: Execution failed - No behavior data found for UUID: ${this.behaviorUUID}`,
                status: "error",
            };
        }

        if (this.editor.isSandbox && this.behaviorData) {
            this.editor.removePendingBehavior(this.selected, this.behaviorData);
        }

        this.behavior = this.game?.behaviorManager?.getBehaviorByUUID(this.behaviorUUID) || null;
        if (this.behavior) {
            this.game?.behaviorManager?.destroyBehavior(this.behavior);
        }
        return {
            message: `DetachBehaviorCommand: Behavior detached (${this.behaviorData?.id || this.behaviorUUID})`,
            status: "success",
        };
    }

    async undo(): Promise<{message: string; status: "success" | "info" | "error"} | void> {
        if (!this.selected || !this.editor || !this.behaviorData) {
            console.error("DetachBehaviorCommand: No selected object, editor, or behavior data is not initialized.");
            return {
                message: `DetachBehaviorCommand: Undo failed - No selected object, editor, or behavior data is not initialized.`,
                status: "error",
            };
        }

        // Use the editor's addBehaviorToObject method
        this.behaviorData = this.editor.addBehaviorToObject(
            this.selected,
            this.behaviorData.id,
            {
                attributesData: this.behaviorData.attributesData,
                throttleConfig: this.behaviorData.throttleConfig,
                uuid: this.behaviorData.uuid,
                enabled: this.behaviorData.enabled,
            },
        );

        try {
            if (this.behaviorData) {
                this.behaviorUUID = this.behaviorData.uuid;

                const options: CreateBehaviorOptions = {
                    uuid: this.behaviorData.uuid,
                    attributes: this.behaviorData.attributesData,
                    throttleConfig: this.behaviorData.throttleConfig,
                };
                this.behavior =
                    await this.game?.addBehaviorToObject(this.selected, this.behaviorData.id, options) || null;
            }

            if (this.selected === this.editor?.selected && this.behavior) {
                this.game?.behaviorManager?.pauseBehavior(this.behavior);
            }
        } catch (error) {
            console.error("DetachBehaviorCommand: Error while re-adding behavior to object:", error);
            return {
                message: `DetachBehaviorCommand: Undo failed - Behavior re-attached but failed to initialize (${this.behaviorData?.id})`,
                status: "error",
            };
        }

        return {
            message: `DetachBehaviorCommand: Behavior re-attached (${this.behaviorData?.id})`,
            status: "success",
        };
    }

    redo(): {message: string; status: "success" | "info" | "error"} {
        return this.execute();
    }
}

export {DetachBehaviorCommand};
