import * as THREE from "three";
import {toast} from "toastywave";

import AIWorldController from "../../controls/AiWorldController/AiWorldController";
import {addIndicator, removeIndicator} from "../../controls/AiWorldController/AiWorldController.utils";
import global from "../../global";
import Command from "../Command";
import {Add3dObjectCommand, RemoveObjectCommand} from "../Commands";

class Generate3dObjectCommand extends Command {
    private aiWorldController: AIWorldController;
    private prompt: string = "";
    private negativePrompt: string = "";
    private position: THREE.Vector3 | null = null;
    private model: THREE.Object3D | null = null;
    private abortController: AbortController;
    private callback?: (model: THREE.Object3D) => void;

    constructor(
        prompt: string,
        negativePrompt: string,
        position: THREE.Vector3Like,
        callback?: (model: THREE.Object3D) => void,
    ) {
        super();
        this.aiWorldController = AIWorldController.getInstance(global.app!);
        this.prompt = prompt;
        this.negativePrompt = negativePrompt;
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.abortController = new AbortController();
        this.callback = callback;
    }

    async execute(): Promise<any> {
        let displayedProgress = 0;
        let uuid = THREE.MathUtils.generateUUID();
        const {indicator} = addIndicator(
            uuid,
            {x: this.position?.x || 0, y: this.position?.y || 0},
            this.position || new THREE.Vector3(),
        );
        try {
            const objData = await this.aiWorldController.generateAndUpload3dObject(
                {
                    generationType: "text_to_model",
                    prompt: this.prompt,
                    negative_prompt: this.negativePrompt,
                    enhancePrompt: true,
                },
                progress => {
                    if (progress > 90) {
                        displayedProgress++;
                        if (displayedProgress > progress) {
                            displayedProgress = progress;
                        }
                    } else {
                        displayedProgress = progress;
                    }
                    global.app?.call("updateIndicator", null, {progress: displayedProgress, uuid});
                },
            );

            global.app?.call("updateIndicator", null, {progress: 100, uuid});

            if (!objData?.assetId) {
                throw new Error("Failed to upload object");
            }

            const cmd = new Add3dObjectCommand(
                objData.assetId,
                objData.Name || this.prompt,
                "local",
                "",
                this.position || new THREE.Vector3(),
                objData.width || 1,
                objData.height || 1,
                (model: THREE.Object3D) => {
                    this.model = model;
                    this.callback?.(model);
                },
            );
            
            await cmd.execute();

            return {
                message: "Generate3dObjectCommand: Model generated successfully",
                status: "success",
                objData: objData,
                model: this.model,
            };
        } catch (e) {
            const err = e as {name?: string; message?: string; response?: {data?: unknown}};
            if (err.name === "AbortError" || err.message === "CanceledError") {
                toast.info("Model generation cancelled");
            }
            // Extract actionable error message from Axios response or error chain
            let reason = err?.response?.data || err?.message || "Unknown error";
            if (typeof reason !== "string") reason = JSON.stringify(reason);
            console.error("Generate3dObjectCommand: Error during model generation:", e);
            return {
                message: `Generate3dObjectCommand: Failed to generate model — ${reason}`,
                status: "error",
            };
        } finally {
            removeIndicator(indicator);
        }
    }

    cancel(): void {
        this.abortController.abort();
    }

    undo(): void {
        if (this.model) {
            const removeCommand = new RemoveObjectCommand(this.model);
            removeCommand.execute();
        }
    }

    async redo(): Promise<any> {
        return await this.execute();
    }
}

export {Generate3dObjectCommand};
