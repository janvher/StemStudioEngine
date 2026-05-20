import { BehaviorConstructor } from "./Behavior";

class BehaviorTypeRegistry {
	private behaviorTypes: Map<string, BehaviorConstructor> = new Map();

	constructor() {}

	registerType(id: string, type: BehaviorConstructor) {
		if (this.behaviorTypes.has(id)) {
			console.error(`[BehaviorTypeRegistry] Behavior type "${id}" already registered.`);
			return;
		}
		this.behaviorTypes.set(id, type);
		// console.info(`[BehaviorTypeRegistry] Behavior type "${id}" registered successfully.`);
	}

	getType(id: string): BehaviorConstructor | null {
		return this.behaviorTypes.get(id) || null;
	}

	unregisterType(id: string) {
		if (this.behaviorTypes.has(id)) {
			this.behaviorTypes.delete(id);

			// console.info(`[BehaviorTypeRegistry] Behavior type "${id}" unregistered successfully.`);
		} else {
			console.error(`[BehaviorTypeRegistry] Cannot unregister behavior "${id}", it is not registered.`);
		}
	}

	getAllTypes(): BehaviorConstructor[] {
		return Array.from(this.behaviorTypes.values());
	}

	clear() {
		this.behaviorTypes.clear();
	}
}

export default BehaviorTypeRegistry;
