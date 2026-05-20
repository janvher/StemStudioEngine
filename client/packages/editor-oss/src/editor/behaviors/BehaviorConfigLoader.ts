import { BehaviorConfig } from "./BehaviorConfig";
import IBehaviorConfigLoader from "./IBehaviorConfigLoader";

class BehaviorConfigLoader implements IBehaviorConfigLoader {

    constructor() {}

    async loadConfigs(): Promise<BehaviorConfig[]> {
        // @ts-ignore - vite specific
        const modules = import.meta.glob('../../behaviors/packs/**/behavior.json');
        const configs: BehaviorConfig[] = [];

        for (const path in modules) {
            const module = await modules[path]!() as { default: BehaviorConfig };
            configs.push(module.default);
        }

        return configs;
    }

}

export default BehaviorConfigLoader;