import global from "@stem/editor-oss/global";
class BehaviorScriptRegistry {
	private behaviorScripts: Map<string, string> = new Map();

	constructor() {}

	registerScript(name: string, script: string, noEmit: boolean = false) {
		if (this.getScript(name)) {
			return;
		}
		
		this.behaviorScripts.set(name, script);
		if (!noEmit) {
			global.app?.call("scriptRegistered", this, {name, script});
		}
	}

	getScript(name: string): string | null {
		return this.behaviorScripts.get(name) || null;
	}

	unregisterScript(name: string, noEmit: boolean = false) {
		const script = this.getScript(name);
		if (!script) {
			console.warn(`Behavior script "${name}" not found.`);
			return;
		}

		this.behaviorScripts.delete(name);
		if (!noEmit) {
			global.app?.call("scriptUnregistered", this, {name, script});
		}
	}

	updateScript(name: string, script: string, noEmit: boolean = false) {
		const existingScript = this.getScript(name);
		if (!existingScript) {
			console.warn(`Behavior script "${name}" not found.`);
			return;
		}

		this.behaviorScripts.set(name, script);
		if (!noEmit) {
			global.app?.call("scriptUpdated", this, {name, script});
		}
	}

	getScripts(): Record<string, string> {
		const scripts: Record<string, string> = {};
		this.behaviorScripts.forEach((script, name) => {
			scripts[name] = script;
		});
		return scripts;
	}

	clear() {
		this.behaviorScripts.clear();
	}

}

export default BehaviorScriptRegistry;
