import {t} from "i18next";
import * as THREE from "three";

import {AddObjectCommand} from "../AddObjectCommand";
import Command from "../Command";
import {scatterOnSurface, ScatterOptions} from "../../utils/SurfaceScatter";
import global from "../../global";

/**
 * ScatterCommand — scatter instances of a source mesh across the surface
 * of a target mesh and insert the resulting InstancedMesh into the scene.
 *
 * Delegates to AddObjectCommand so the standard add path fires
 * `objectAdded` — collaboration sync picks up the new InstancedMesh via
 * the scene-serializer path (see the master plan's Architecture Invariant
 * section about state-based collab). No custom CollaborationClient
 * wiring needed because InstancedMesh is native THREE and round-trips
 * through ObjectLoader cleanly.
 */
export class ScatterCommand extends Command {
    private source: THREE.Mesh;
    private target: THREE.Mesh;
    private options: ScatterOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addCommand: any;
    private result: THREE.InstancedMesh | null;

    constructor(source: THREE.Mesh, target: THREE.Mesh, options: ScatterOptions) {
        super();
        this.type = "ScatterCommand";
        this.name = t("Scatter");
        (this as any).editor = global?.app?.editor;

        this.source = source;
        this.target = target;
        this.options = options;
        this.addCommand = null;
        this.result = null;

        if (!source || !(source as any).isMesh) {
            throw new Error("ScatterCommand: source must be a THREE.Mesh");
        }
        if (!target || !(target as any).isMesh) {
            throw new Error("ScatterCommand: target must be a THREE.Mesh");
        }
        if (options.count < 1) {
            throw new Error("ScatterCommand: count must be >= 1");
        }
    }

    async execute() {
        try {
            this.result = scatterOnSurface(this.source, this.target, this.options);
            const editor: any = (this as any).editor ?? global?.app?.editor;
            const parent = editor?.scene ?? null;
            this.addCommand = new AddObjectCommand(this.result, parent);
            await this.addCommand.execute();
            return {
                message: `ScatterCommand: ${this.options.count} instance(s) scattered`,
                status: "success",
            };
        } catch (error: any) {
            return {
                message: `ScatterCommand failed: ${error?.message}`,
                status: "error",
            };
        }
    }

    undo() {
        if (this.addCommand) {
            this.addCommand.undo();
        }
        return {message: "ScatterCommand: undone", status: "success"};
    }

    toJSON() {
        const output: any = Command.prototype.toJSON.call(this);
        output.sourceUuid = this.source.uuid;
        output.targetUuid = this.target.uuid;
        output.options = this.options;
        if (this.result) output.resultUuid = this.result.uuid;
        return output;
    }

    fromJSON(json: any) {
        Command.prototype.fromJSON.call(this, json);
        const editor: any = (this as any).editor;
        this.source = editor?.objectByUuid?.(json.sourceUuid);
        this.target = editor?.objectByUuid?.(json.targetUuid);
        this.options = json.options;
    }
}
