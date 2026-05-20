import * as THREE from "three";

import GameManager from "../../behaviors/game/GameManager";
import global from "../../global";
import type {LambdaComponentData} from "../../lambdas/Lambda";
import Command from "../Command";

class DetachLambdaComponentCommand extends Command {
    private selected: THREE.Object3D | null = null;
    private componentUUID: string = "";
    private storedData: LambdaComponentData | null = null;
    private storedIndex: number = -1;
    private game: GameManager | null = null;

    constructor(selected: THREE.Object3D | null, componentUUID: string) {
        super();
        this.selected = selected;
        this.componentUUID = componentUUID;
        this.editor = global.app?.editor || null;
        this.game = global.app?.game || null;
    }

    execute(): {message: string; status: "success" | "info" | "error"} {
        if (!this.selected || !this.editor) {
            return {
                message: "DetachLambdaComponentCommand: No selected object or editor",
                status: "error",
            };
        }

        const components = this.selected.userData?.lambdaComponents as LambdaComponentData[] | undefined;
        if (!components) {
            return {
                message: "DetachLambdaComponentCommand: No lambda components on object",
                status: "error",
            };
        }

        // Find and store the component for undo
        this.storedIndex = components.findIndex(c => c.uuid === this.componentUUID);
        if (this.storedIndex === -1) {
            return {
                message: `DetachLambdaComponentCommand: Component ${this.componentUUID} not found`,
                status: "error",
            };
        }

        const original = components[this.storedIndex]!;
        this.storedData = {
            lambdaId: original.lambdaId,
            instanceId: original.instanceId,
            uuid: original.uuid,
            prefabLambdaUuid: original.prefabLambdaUuid,
            enabled: original.enabled,
            componentData: {...original.componentData},
        };

        // Remove from userData
        components.splice(this.storedIndex, 1);

        // Deregister from runtime
        if (this.storedData.enabled) {
            this.game?.lambdaManager?.deregisterObject(this.storedData.instanceId, this.selected);
        }

        this.emitChange();

        return {
            message: `DetachLambdaComponentCommand: Lambda component detached (${this.storedData.lambdaId})`,
            status: "success",
        };
    }

    undo(): {message: string; status: "success" | "info" | "error"} {
        if (!this.selected || !this.storedData) {
            return {
                message: "DetachLambdaComponentCommand: Undo failed - missing data",
                status: "error",
            };
        }

        // Re-add to userData at original index
        if (!this.selected.userData.lambdaComponents) {
            this.selected.userData.lambdaComponents = [];
        }
        const components = this.selected.userData.lambdaComponents as LambdaComponentData[];
        const insertIndex = Math.min(this.storedIndex, components.length);
        components.splice(insertIndex, 0, this.storedData);

        // Re-register with runtime
        if (this.storedData.enabled) {
            this.game?.lambdaManager?.registerObject(
                this.storedData.instanceId,
                this.selected,
                this.storedData.componentData,
            );
        }

        return {
            message: `DetachLambdaComponentCommand: Lambda component re-attached (${this.storedData.lambdaId})`,
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

export {DetachLambdaComponentCommand};
