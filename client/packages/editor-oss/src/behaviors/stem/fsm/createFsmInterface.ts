import type {AnyActorRef, AnyStateMachine} from "xstate";

import type {StemFsm, FsmActor, FsmSnapshot, MachineConfig} from "./StemFsm";

// Cached library promise so the dynamic import only fires once across the
// whole process. xstate is ~16 KB gzipped — keeping it out of the main
// engine bundle is the whole point of the lazy load.
type XStateModule = typeof import("xstate");
let _libPromise: Promise<XStateModule> | null = null;
const loadLib = (): Promise<XStateModule> => {
    if (!_libPromise) _libPromise = import("xstate");
    return _libPromise;
};

const toSnapshot = (actor: AnyActorRef): FsmSnapshot => {
    const snap = actor.getSnapshot() as {value: FsmSnapshot["value"]; context: FsmSnapshot["context"]; status: string};
    return {
        value: snap.value,
        context: snap.context,
        done: snap.status === "done",
    };
};

const wrap = (machine: AnyStateMachine, lib: XStateModule): FsmActor => {
    const actor = lib.createActor(machine);
    let started = false;
    const handle: FsmActor = {
        start() {
            if (!started) {
                actor.start();
                started = true;
            }
            return handle;
        },
        stop() {
            if (started) {
                actor.stop();
                started = false;
            }
        },
        send(event) {
            const e = typeof event === "string" ? {type: event} : event;
            actor.send(e);
        },
        snapshot() {
            return toSnapshot(actor);
        },
        subscribe(fn) {
            const sub = actor.subscribe(() => fn(toSnapshot(actor)));
            fn(toSnapshot(actor));
            return () => sub.unsubscribe();
        },
        matches(statePath) {
            const snap = actor.getSnapshot() as {matches: (s: string) => boolean};
            return snap.matches(statePath);
        },
    };
    return handle;
};

export const createFsmInterface = (): StemFsm => {
    return {
        async create(config: MachineConfig): Promise<FsmActor> {
            const lib = await loadLib();
            const machine = lib.createMachine(config);
            return wrap(machine, lib);
        },
    };
};
