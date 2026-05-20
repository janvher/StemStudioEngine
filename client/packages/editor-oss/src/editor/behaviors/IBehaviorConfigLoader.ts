import { BehaviorConfig } from "./BehaviorConfig";

interface IBehaviorConfigLoader {
	loadConfigs(): Promise<BehaviorConfig[]>;
}

export default IBehaviorConfigLoader;
