import type {BTAgent, BTDefinition, BTHandle, BTState, StemBehaviorTree} from "./StemBehaviorTree";

// Cached library promise so the dynamic import only fires once across the
// whole process. mistreevous is ~20 KB gzipped — kept out of the main
// engine bundle and pulled in only when a behavior actually creates a tree.
type MistreevousModule = typeof import("mistreevous");
let _libPromise: Promise<MistreevousModule> | null = null;
const loadLib = (): Promise<MistreevousModule> => {
    if (!_libPromise) _libPromise = import("mistreevous");
    return _libPromise;
};

const stateName = (s: import("mistreevous").State, lib: MistreevousModule): BTState => {
    const State = lib.State;
    switch (s) {
        case State.READY: return "READY";
        case State.RUNNING: return "RUNNING";
        case State.SUCCEEDED: return "SUCCEEDED";
        case State.FAILED: return "FAILED";
        default: return "READY";
    }
};

export const createBehaviorTreeInterface = (): StemBehaviorTree => {
    return {
        async create(definition: BTDefinition, agent: BTAgent): Promise<BTHandle> {
            const lib = await loadLib();
            const tree = new lib.BehaviourTree(definition as any, agent);
            return {
                step() { tree.step(); },
                reset() { tree.reset(); },
                getState() { return stateName(tree.getState(), lib); },
                isRunning() { return tree.isRunning(); },
            };
        },
    };
};
