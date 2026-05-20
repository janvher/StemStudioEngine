import { AnimationAction, LoopOnce, LoopRepeat, Object3D } from "three";

import { LambdaBase } from "../../LambdaBase";

type ActionType = "play" | "stop" | "set_param";

type AnimationControlData = {
    action?: ActionType;
    clipName?: string;
    loop?: boolean;
    timeScale?: number;
    paramName?: string;
    paramType?: "number" | "boolean" | "string";
    paramValue?: unknown;
};

export default class AnimationControlLambda extends LambdaBase {
    private getActionMap(target: Object3D): Record<string, AnimationAction> {
        return (target.userData?.animationActions || {}) as Record<string, AnimationAction>;
    }

    private parseValue(type: string, value: unknown): unknown {
        const raw = typeof value === "string" ? value.trim() : value;
        if (type === "boolean") {
            return raw === true || raw === "true";
        }
        if (type === "number") {
            const num = Number(raw);
            return Number.isFinite(num) ? num : 0;
        }
        return raw;
    }

    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (object, data) => {
            const cfg = data as AnimationControlData;
            const action = cfg.action || "play";
            const clipName = String(cfg.clipName || "").trim();
            const actionMap = this.getActionMap(object);

            if (action === "set_param") {
                const paramName = String(cfg.paramName || "").trim();
                if (!paramName) {
                    return;
                }
                const paramType = cfg.paramType || "number";
                object.userData = object.userData || {};
                object.userData.animationParams = object.userData.animationParams || {};
                object.userData.animationParams[paramName] = this.parseValue(paramType, cfg.paramValue);
                return;
            }

            if (!clipName) {
                return;
            }

            const clipAction = actionMap[clipName];
            if (!clipAction) {
                object.userData.requestedAnimation = clipName;
                object.userData.requestedAnimationAction = action;
                return;
            }

            if (action === "stop") {
                clipAction.stop();
                return;
            }

            clipAction.reset();
            clipAction.enabled = true;
            clipAction.timeScale = Number(cfg.timeScale) || 1;
            clipAction.setLoop(cfg.loop === false ? LoopOnce : LoopRepeat, cfg.loop === false ? 1 : Infinity);
            clipAction.play();
            object.userData.currentAnimation = clipName;
        });
    }
}
