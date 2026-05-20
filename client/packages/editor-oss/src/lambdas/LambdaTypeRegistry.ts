import type {LambdaConstructor} from "./Lambda";

class LambdaTypeRegistry {
    private lambdaTypes: Map<string, LambdaConstructor> = new Map();

    constructor() {}

    registerType(id: string, type: LambdaConstructor) {
        if (this.lambdaTypes.has(id)) {
            console.error(`[LambdaTypeRegistry] Lambda type "${id}" already registered.`);
            return;
        }
        this.lambdaTypes.set(id, type);
    }

    getType(id: string): LambdaConstructor | null {
        return this.lambdaTypes.get(id) || null;
    }

    unregisterType(id: string) {
        if (this.lambdaTypes.has(id)) {
            this.lambdaTypes.delete(id);
        } else {
            console.error(`[LambdaTypeRegistry] Cannot unregister lambda "${id}", it is not registered.`);
        }
    }

    getAllTypes(): LambdaConstructor[] {
        return Array.from(this.lambdaTypes.values());
    }

    clear() {
        this.lambdaTypes.clear();
    }
}

export default LambdaTypeRegistry;
