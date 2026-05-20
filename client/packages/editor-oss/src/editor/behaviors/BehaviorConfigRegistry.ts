import { BehaviorConfig } from "./BehaviorConfig";
import global from "@stem/editor-oss/global";
class BehaviorConfigRegistry {
	private behaviorConfigs: Map<string, BehaviorConfig> = new Map();

	constructor() {}

	registerConfig(id: string, config: BehaviorConfig, noEmit: boolean = false) {
		if (this.behaviorConfigs.has(id)) {
			console.warn(`Behavior with id "${id}" already registered.`);
			return;
		}
		this.behaviorConfigs.set(id, config);
		if (!noEmit) {
			global.app?.call("behaviorRegistered", this, {id, config});
		}
		// console.log(`Behavior "${id}" registered successfully.`);
	}

	getConfig(id: string): BehaviorConfig | null {
		return this.behaviorConfigs.get(id) || null;
	}

	unregisterConfig(id: string, noEmit: boolean = false) {
		if (this.behaviorConfigs.has(id)) {
			this.behaviorConfigs.delete(id);
			if (!noEmit) {
				global.app?.call("behaviorUnregistered", this, {id});
			}
			// console.log(`Behavior "${id}" unregistered successfully.`);
		} else {
			console.warn(`Cannot unregister behavior "${id}", it is not registered.`);
		}
	}

	getAllConfigs(): BehaviorConfig[] {
		return Array.from(this.behaviorConfigs.values());
	}

	clear() {
		this.behaviorConfigs.clear();
	}

	clearScripts() {
		for (const config of this.behaviorConfigs.values()) {
			if (config.isScript) {
				this.unregisterConfig(config.id);
			}
		}
	}

}

export default BehaviorConfigRegistry;
