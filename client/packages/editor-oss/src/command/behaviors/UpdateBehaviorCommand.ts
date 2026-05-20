import * as THREE from "three";

import {Behavior} from "../../behaviors/Behavior";
import BehaviorData from "../../behaviors/BehaviorData";
import GameManager from "../../behaviors/game/GameManager";
import global from "../../global";
import Command from "../Command";

class UpdateBehaviorCommand extends Command {
    private selected: THREE.Object3D | null = null;
    private behaviorId: string = "";
    private newProperties: Record<string, any> = {};
    private oldBehaviorData: BehaviorData | null = null;
    private newBehaviorData: BehaviorData | null = null;
    private behavior: Behavior | null = null;
    private game: GameManager | null = null;

    constructor(selected: THREE.Object3D | null, behaviorId: string, newProperties: Record<string, any>) {
        super();
        this.selected = selected;
        this.behaviorId = behaviorId;
        this.newProperties = newProperties;
        this.editor = global.app?.editor || null;
        this.game = global.app?.game || null;
    }

    execute(): {message: string; status: "success" | "info" | "error"} | void {
        if (!this.selected || !this.editor) {
            console.error("UpdateBehaviorCommand: No selected object or editor is not initialized.");
            return {
                message: `UpdateBehaviorCommand: Execution failed - No selected object or editor is not initialized.`,
                status: "error",
            };
        }

        // Remove the existing behavior and store its data
        this.oldBehaviorData = this.editor.removeBehaviorFromObject(this.selected, this.behaviorId) || null;

        if (!this.oldBehaviorData) {
            console.error("UpdateBehaviorCommand: Failed to find behavior with the given ID.");
            return {
                message: `UpdateBehaviorCommand: Execution failed - Failed to find behavior with the given ID.`,
                status: "error",
            };
        }

        // Add the updated behavior with new properties
        this.newBehaviorData = this.editor.addBehaviorToObject(
            this.selected,
            this.oldBehaviorData.id,
            {
                attributesData: this.newProperties,
                throttleConfig: this.oldBehaviorData.throttleConfig,
            },
        );
        if (!this.newBehaviorData) {
            console.error("UpdateBehaviorCommand: Failed to add updated behavior.");
            return {
                message: `UpdateBehaviorCommand: Execution failed - Failed to add updated behavior.`,
                status: "error",
            };
        }
        this.behaviorId = this.newBehaviorData.id;

        this.behavior = this.game?.updateBehaviorAttributes(this.newBehaviorData.uuid, this.newProperties) || null;

        return {
            message: `UpdateBehaviorCommand: Behavior updated (${this.newBehaviorData.id})`,
            status: "success",
        };
    }

    undo(): {message: string; status: "success" | "info" | "error"} | void {
        if (!this.selected || !this.editor || !this.oldBehaviorData) {
            console.error(
                "UpdateBehaviorCommand: No selected object, editor, or old behavior data is not initialized.",
            );
            return {
                message: `UpdateBehaviorCommand: Undo failed - No selected object, editor, or old behavior data is not initialized.`,
                status: "error",
            };
        }

        // Remove the updated behavior
        this.editor.removeBehaviorFromObject(this.selected, this.behaviorId);

        // Re-add the old behavior with its original properties
        this.editor.addBehaviorToObject(this.selected, this.oldBehaviorData.id, {
            attributesData: this.oldBehaviorData.attributesData,
            throttleConfig: this.oldBehaviorData.throttleConfig,
        });
        this.game?.updateBehaviorAttributes(this.oldBehaviorData.uuid, this.oldBehaviorData.attributesData ?? {});
        return {
            message: `UpdateBehaviorCommand: Behavior reverted (${this.oldBehaviorData.id})`,
            status: "success",
        };
    }

    redo(): {message: string; status: "success" | "info" | "error"} | void {
        return this.execute();
    }
}

export {UpdateBehaviorCommand};
