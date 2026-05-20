import { Object3D } from "three";

import { LambdaBase } from "../../LambdaBase";

type SetVariableData = {
    scope?: "scene" | "object" | "player";
    path?: string;
    mode?: "set" | "inc";
    value?: unknown;
};

export default class SetVariableLambda extends LambdaBase {
    private parseValue(value: unknown): unknown {
        if (typeof value !== "string") {
            return value;
        }
        const trimmed = value.trim();
        if (!trimmed) return "";
        if (trimmed === "true") return true;
        if (trimmed === "false") return false;
        if (trimmed === "null") return null;
        if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
        try {
            return JSON.parse(trimmed);
        } catch {
            return value;
        }
    }

    private getRoot(scope: "scene" | "object" | "player", object: Object3D): Record<string, unknown> | undefined {
        if (scope === "player") {
            return this._game?.player?.userData;
        }
        if (scope === "object") {
            return object.userData;
        }
        return this._game?.scene?.userData;
    }

    private setByPath(root: Record<string, unknown>, path: string, value: unknown, mode: "set" | "inc"): void {
        const parts = path.split(".").filter(Boolean);
        if (parts.length === 0) return;

        let current: Record<string, unknown> = root;
        for (let i = 0; i < parts.length - 1; i++) {
            const key = parts[i]!;
            if (current[key] == null || typeof current[key] !== "object") {
                current[key] = {};
            }
            current = current[key] as Record<string, unknown>;
        }

        const leaf = parts[parts.length - 1]!;
        if (mode === "inc") {
            const prev = Number(current[leaf]) || 0;
            current[leaf] = prev + (Number(value) || 0);
            return;
        }

        current[leaf] = value;
    }

    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (object, data) => {
            const cfg = data as SetVariableData;
            const scope = cfg.scope || "scene";
            const path = String(cfg.path || "").trim();
            if (!path) {
                return;
            }

            const root = this.getRoot(scope, object);
            if (!root) {
                return;
            }

            this.setByPath(root, path, this.parseValue(cfg.value), cfg.mode === "inc" ? "inc" : "set");
        });
    }
}
