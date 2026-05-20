import * as THREE from "three";

import GameManager from "../../behaviors/game/GameManager";
import LambdaDataFactory from "../../editor/lambdas/LambdaDataFactory";
import global from "../../global";
import type {LambdaComponentData, LambdaFieldConfig} from "../../lambdas/Lambda";
import Command from "../Command";

class AttachLambdaComponentCommand extends Command {
    private selected: THREE.Object3D | null = null;
    private lambdaId: string = "";
    private instanceId: string = "";
    private componentData: LambdaComponentData | null = null;
    private game: GameManager | null = null;
    private componentSchema?: Record<string, LambdaFieldConfig>;
    private initialData?: Record<string, unknown>;

    constructor(
        selected: THREE.Object3D | null,
        lambdaId: string,
        instanceId: string,
        options?: {
            componentSchema?: Record<string, LambdaFieldConfig>;
            initialData?: Record<string, unknown>;
        },
    ) {
        super();
        this.selected = selected;
        this.lambdaId = lambdaId;
        this.instanceId = instanceId;
        this.componentSchema = options?.componentSchema;
        this.initialData = options?.initialData;
        this.editor = global.app?.editor || null;
        this.game = global.app?.game || null;
    }

    execute(): {message: string; status: "success" | "info" | "error"} {
        if (!this.selected || !this.editor) {
            return {
                message: "AttachLambdaComponentCommand: No selected object or editor",
                status: "error",
            };
        }

        // Create component data
        this.componentData = LambdaDataFactory.createData(this.lambdaId, this.instanceId, this.componentSchema);

        // Apply initial data overrides
        if (this.initialData) {
            this.componentData.componentData = {
                ...this.componentData.componentData,
                ...this.initialData,
            };
        }

        // Add to userData
        if (!this.selected.userData) {
            this.selected.userData = {};
        }
        if (!this.selected.userData.lambdaComponents) {
            this.selected.userData.lambdaComponents = [];
        }
        this.selected.userData.lambdaComponents.push(this.componentData);

        // Register with runtime
        if (this.componentData.enabled) {
            this.game?.lambdaManager?.registerObject(this.instanceId, this.selected, this.componentData.componentData);
        }

        this.emitChange();

        return {
            message: `AttachLambdaComponentCommand: Lambda component attached (${this.lambdaId})`,
            status: "success",
        };
    }

    undo(): {message: string; status: "success" | "info" | "error"} {
        if (!this.selected || !this.componentData) {
            return {
                message: "AttachLambdaComponentCommand: Undo failed - missing data",
                status: "error",
            };
        }

        // Remove from userData
        const components = this.selected.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (components) {
            const index = components.findIndex(c => c.uuid === this.componentData!.uuid);
            if (index !== -1) {
                components.splice(index, 1);
            }
        }

        // Deregister from runtime
        this.game?.lambdaManager?.deregisterObject(this.instanceId, this.selected);

        this.emitChange();

        return {
            message: `AttachLambdaComponentCommand: Lambda component removed (${this.lambdaId})`,
            status: "success",
        };
    }

    redo(): {message: string; status: "success" | "info" | "error"} {
        return this.execute();
    }

    emitChange(): void {
        if (this.editor) {
            console.log("Emitting objectChanged for selected and scene");
            global.app?.call("objectChanged", this.editor, this.selected);
            global.app?.call("objectChanged", this.editor, this.editor.scene);
        }
    }
}

export {AttachLambdaComponentCommand};
