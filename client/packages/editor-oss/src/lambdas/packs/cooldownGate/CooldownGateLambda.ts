import { Object3D } from "three";

import { LambdaBase } from "../../LambdaBase";

type CooldownData = {
    cooldownSeconds?: number;
    flagKey?: string;
    consumeOnPass?: boolean;
    _lastConsumedAt?: number;
};

export default class CooldownGateLambda extends LambdaBase {
    private consumeObject(target: Object3D): void {
        const data = this.getComponentData(target) as CooldownData | null;
        if (!data) {
            return;
        }
        data._lastConsumedAt = Date.now();
    }

    onEvent(msg: string, payload: any): void {
        if (msg !== "trigger") {
            return;
        }

        if (payload?.object) {
            this.consumeObject(payload.object as Object3D);
            return;
        }

        for (const object of this.registeredObjects.keys()) {
            this.consumeObject(object);
        }
    }

    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (object, data) => {
            const cfg = data as CooldownData;
            const cooldown = Math.max(0, Number(cfg.cooldownSeconds) || 0);
            const last = Number(cfg._lastConsumedAt) || 0;
            const ready = last === 0 || Date.now() - last >= cooldown * 1000;
            const flagKey = String(cfg.flagKey || "cooldownReady");
            object.userData[flagKey] = ready;

            if (ready && cfg.consumeOnPass === true) {
                cfg._lastConsumedAt = Date.now();
            }
        });
    }
}
