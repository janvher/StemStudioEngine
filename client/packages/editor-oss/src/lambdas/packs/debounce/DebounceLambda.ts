import { LambdaBase } from "../../LambdaBase";

type DebounceData = {
    sourceKey?: string;
    outputKey?: string;
    delaySeconds?: number;
    _lastSourceValue?: any;
    _lastChangedAt?: number;
};

export default class DebounceLambda extends LambdaBase {
    update(deltaTime: number = 0.016): void {
        this.processObjects(deltaTime, (object, data) => {
            const cfg = data as DebounceData;
            const sourceKey = String(cfg.sourceKey || "").trim();
            if (!sourceKey) {
                return;
            }

            const outputKey = String(cfg.outputKey || "debouncedValue");
            const delayMs = Math.max(0, (Number(cfg.delaySeconds) || 0) * 1000);
            const sourceValue = object.userData[sourceKey];

            if (cfg._lastSourceValue !== sourceValue) {
                cfg._lastSourceValue = sourceValue;
                cfg._lastChangedAt = Date.now();
            }

            const lastChangedAt = Number(cfg._lastChangedAt) || 0;
            if (lastChangedAt > 0 && Date.now() - lastChangedAt >= delayMs) {
                object.userData[outputKey] = sourceValue;
            }
        });
    }
}
