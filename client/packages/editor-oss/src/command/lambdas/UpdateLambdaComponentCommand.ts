import * as THREE from "three";

import GameManager from "../../behaviors/game/GameManager";
import global from "../../global";
import type {LambdaComponentData} from "../../lambdas/Lambda";
import Command from "../Command";

class UpdateLambdaComponentCommand extends Command {
    private selected: THREE.Object3D | null = null;
    private componentUUID: string = "";
    private newData: Record<string, any> = {};
    private oldData: Record<string, any> | null = null;
    private game: GameManager | null = null;

    constructor(selected: THREE.Object3D | null, componentUUID: string, newData: Record<string, any>) {
        super();
        this.selected = selected;
        this.componentUUID = componentUUID;
        this.newData = newData;
        this.editor = global.app?.editor || null;
        this.game = global.app?.game || null;
    }

    execute(): {message: string; status: "success" | "info" | "error"} {
        if (!this.selected || !this.editor) {
            return {
                message: "UpdateLambdaComponentCommand: No selected object or editor",
                status: "error",
            };
        }

        const components = this.selected.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) {
            return {
                message: "UpdateLambdaComponentCommand: No lambda components on object",
                status: "error",
            };
        }

        const component = components.find(c => c.uuid === this.componentUUID);
        if (!component) {
            return {
                message: `UpdateLambdaComponentCommand: Component ${this.componentUUID} not found`,
                status: "error",
            };
        }

        // Store old data for undo
        this.oldData = {...component.componentData};

        // Apply new data
        component.componentData = {...component.componentData, ...this.newData};

        // Update runtime - re-register with new data (uses forwarding for fused objects)
        if (component.enabled && this.game?.lambdaManager) {
            for (const [key, value] of Object.entries(this.newData)) {
                this.game.lambdaManager.setObjectComponentData(component.instanceId, this.selected, key, value);
            }
        }

        this.emitChange();

        return {
            message: `UpdateLambdaComponentCommand: Lambda component updated (${component.lambdaId})`,
            status: "success",
        };
    }

    undo(): {message: string; status: "success" | "info" | "error"} {
        if (!this.selected || !this.oldData) {
            return {
                message: "UpdateLambdaComponentCommand: Undo failed - missing data",
                status: "error",
            };
        }

        const components = this.selected.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) {
            return {
                message: "UpdateLambdaComponentCommand: Undo failed - no components",
                status: "error",
            };
        }

        const component = components.find(c => c.uuid === this.componentUUID);
        if (!component) {
            return {
                message: "UpdateLambdaComponentCommand: Undo failed - component not found",
                status: "error",
            };
        }

        // Restore old data
        component.componentData = {...this.oldData};

        // Update runtime (uses forwarding for fused objects)
        if (component.enabled && this.game?.lambdaManager) {
            for (const [key, value] of Object.entries(this.oldData)) {
                this.game.lambdaManager.setObjectComponentData(component.instanceId, this.selected, key, value);
            }
        }

        this.emitChange();

        return {
            message: `UpdateLambdaComponentCommand: Lambda component reverted (${component.lambdaId})`,
            status: "success",
        };
    }

    redo(): {message: string; status: "success" | "info" | "error"} {
        return this.execute();
    }

    emitChange(): void {
        if (this.editor) {
            global.app?.call("objectChanged", this.editor, this.selected);
            global.app?.call("objectChanged", this.editor, this.editor.scene);
        }
    }
}

export {UpdateLambdaComponentCommand};
