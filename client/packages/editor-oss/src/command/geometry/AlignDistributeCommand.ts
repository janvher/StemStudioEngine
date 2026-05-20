import {t} from "i18next";
import * as THREE from "three";

import global from "../../global";
import Command from "../Command";
import {MultiCmdsCommand} from "../MultiCmdsCommand";
import {SetPositionCommand} from "../SetPositionCommand";

export type AlignDistributeAxis = "x" | "y" | "z";
export type AlignDistributeMode = "align" | "distribute";

/**
 * AlignDistributeCommand — aligns selected objects to the shared bounding-box
 * center on the chosen axis, or distributes them evenly between the two endpoints
 * on that axis. Wraps per-object SetPositionCommand moves in a MultiCmdsCommand
 * so the whole operation is a single undoable step.
 *
 * Alignment model (v1): center-align on axis. The target coordinate is the
 * center of the selection's combined world-space bounding box on that axis.
 * Each object is translated so its own world-space bounding-box center matches
 * that target. Other axes are untouched.
 *
 * Distribution model (v1): sort by world-space bounding-box center on the axis,
 * hold the two endpoint centers fixed, space the interior object centers evenly
 * between them. Requires 3+ objects; for 2 objects there is nothing to
 * distribute and execute() returns a no-op.
 */
export class AlignDistributeCommand extends Command {
    private objects: THREE.Object3D[];
    private axis: AlignDistributeAxis;
    private mode: AlignDistributeMode;
    private wrapped: MultiCmdsCommand | null;

    constructor(objects: THREE.Object3D[], axis: AlignDistributeAxis, mode: AlignDistributeMode) {
        super();
        this.type = "AlignDistributeCommand";
        this.name = t(`${mode === "align" ? "Align" : "Distribute"} ${axis.toUpperCase()}`);
        (this as any).editor = global?.app?.editor;

        this.objects = objects;
        this.axis = axis;
        this.mode = mode;
        this.wrapped = null;

        if (!objects || objects.length < 2) {
            throw new Error("AlignDistributeCommand requires at least 2 objects");
        }
        if (mode === "distribute" && objects.length < 3) {
            throw new Error("Distribute requires at least 3 objects");
        }
    }

    private getWorldCenter(object: THREE.Object3D): THREE.Vector3 {
        object.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        box.getCenter(center);
        return center;
    }

    private buildMoves(): SetPositionCommand[] {
        const axis = this.axis;

        // Snapshot world-space centers before any move so later targets don't
        // drift when we translate objects one after another.
        const centers = this.objects.map(obj => this.getWorldCenter(obj));

        let targets: number[];

        if (this.mode === "align") {
            const combined = new THREE.Box3();
            for (const obj of this.objects) {
                obj.updateMatrixWorld(true);
                combined.expandByObject(obj);
            }
            const selectionCenter = new THREE.Vector3();
            combined.getCenter(selectionCenter);
            const targetCoord = selectionCenter[axis];
            targets = centers.map(() => targetCoord);
        } else {
            // distribute: sort indices by center on the axis, keep endpoints
            // fixed, place interior objects evenly between them.
            const order = this.objects
                .map((_, i) => i)
                .sort((a, b) => centers[a]![axis] - centers[b]![axis]);
            const n = order.length;
            const startIdx = order[0]!;
            const endIdx = order[n - 1]!;
            const startCoord = centers[startIdx]![axis];
            const endCoord = centers[endIdx]![axis];
            const step = (endCoord - startCoord) / (n - 1);
            targets = new Array(this.objects.length).fill(0);
            order.forEach((objIdx, rank) => {
                targets[objIdx] = startCoord + step * rank;
            });
        }

        const moves: SetPositionCommand[] = [];
        for (let i = 0; i < this.objects.length; i++) {
            const obj = this.objects[i]!;
            const center = centers[i]!;
            const targetCoord = targets[i]!;
            const delta = targetCoord - center[axis];
            if (Math.abs(delta) < 1e-6) {
                continue;
            }
            const newWorldPos = obj.getWorldPosition(new THREE.Vector3());
            newWorldPos[axis] += delta;

            // Convert world-space target back into the object's parent space
            // so SetPositionCommand can apply it directly to object.position.
            let localTarget = newWorldPos.clone();
            if (obj.parent) {
                obj.parent.updateMatrixWorld(true);
                localTarget = obj.parent.worldToLocal(localTarget);
            }
            moves.push(new SetPositionCommand(obj, localTarget));
        }

        return moves;
    }

    async execute() {
        try {
            const moves = this.buildMoves();
            if (moves.length === 0) {
                return {
                    message: `${this.name}: no-op (objects already aligned)`,
                    status: "success",
                };
            }
            this.wrapped = new MultiCmdsCommand(moves);
            await this.wrapped.execute();
            return {
                message: `${this.name}: applied to ${moves.length} object(s)`,
                status: "success",
            };
        } catch (error: any) {
            console.error("AlignDistribute error:", error);
            return {
                message: `${this.name} failed: ${error?.message}`,
                status: "error",
            };
        }
    }

    undo() {
        if (this.wrapped) {
            this.wrapped.undo();
        }
        return {
            message: `${this.name}: undone`,
            status: "success",
        };
    }

    toJSON() {
        const output: any = Command.prototype.toJSON.call(this);
        output.axis = this.axis;
        output.mode = this.mode;
        output.objectUuids = this.objects.map(obj => obj.uuid);
        if (this.wrapped) {
            output.wrapped = this.wrapped.toJSON();
        }
        return output;
    }

    fromJSON(json: any) {
        Command.prototype.fromJSON.call(this, json);
        this.axis = json.axis;
        this.mode = json.mode;
        this.objects = json.objectUuids
            .map((uuid: string) => (this as any).editor.objectByUuid(uuid))
            .filter((obj: THREE.Object3D | undefined) => obj !== undefined);
    }
}
