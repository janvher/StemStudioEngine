import type {LambdaConfig} from "./Lambda";
import global from "@stem/editor-oss/global";

export interface LambdaAssetMeta {
    assetId: string;
    revisionId: string;
}

class LambdaConfigRegistry {
    private configs: Map<string, LambdaConfig> = new Map();
    private assetMeta: Map<string, LambdaAssetMeta> = new Map();

    constructor() {}

    registerConfig(id: string, config: LambdaConfig, noEmit: boolean = false) {
        if (this.configs.has(id)) {
            console.error(`[LambdaConfigRegistry] Lambda config "${id}" already registered.`);
            return;
        }
        this.configs.set(id, config);
        if (!noEmit) {
            global.app?.call("lambdaRegistered", this, {id, config});
        }
    }

    getConfig(id: string): LambdaConfig | null {
        return this.configs.get(id) || null;
    }

    unregisterConfig(id: string, noEmit: boolean = false) {
        if (this.configs.has(id)) {
            this.configs.delete(id);
            if (!noEmit) {
                global.app?.call("lambdaUnregistered", this, {id});
            }
        } else {
            console.error(`[LambdaConfigRegistry] Cannot unregister config "${id}", it is not registered.`);
        }
        this.assetMeta.delete(id);
    }

    updateConfig(id: string, config: LambdaConfig, noEmit: boolean = false) {
        if (!this.configs.has(id)) {
            this.registerConfig(id, config, noEmit);
            return;
        }

        this.configs.set(id, config);
        if (!noEmit) {
            global.app?.call("lambdaUpdated", this, {id, config});
        }
    }

    setAssetMeta(configId: string, meta: LambdaAssetMeta) {
        this.assetMeta.set(configId, meta);
    }

    getAssetMeta(configId: string): LambdaAssetMeta | null {
        return this.assetMeta.get(configId) || null;
    }

    getAllConfigs(): LambdaConfig[] {
        return Array.from(this.configs.values());
    }

    clear() {
        this.configs.clear();
        this.assetMeta.clear();
    }
}

export default LambdaConfigRegistry;
