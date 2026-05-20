import {AnimationMixer, Object3D, AnimationClip, EventDispatcher} from "three";

import {AnimationState} from "./AnimationState";
import {BlendTreeState} from "./BlendTreeState";
import {
    IAnimationGraph,
    IAnimationState,
    SerializedGraph,
    AnimationParameter,
    TransitionCondition,
    ITransition,
    ParameterType,
    AnimationGraphEvents,
} from "./types";


export class AnimationGraph extends EventDispatcher<AnimationGraphEvents> implements IAnimationGraph {
    private states: Map<string, IAnimationState> = new Map();
    private currentState: IAnimationState | null = null;
    private transitionInProgress: boolean = false;
    private parameters: Map<string, AnimationParameter> = new Map();
    private currentStateTime: number = 0;
    private mixer: AnimationMixer;

    constructor(root: Object3D) {
        super();

        this.mixer = new AnimationMixer(root);
        this.ensureCoreStates();
        const idleKey = this.findIdleKey();
        if (idleKey) {
            this.setState(idleKey);
        }
    }

    setState(id: string, fadeInDuration: number = 0.2, fadeOutDuration: number = 0.2): void {
        const targetState = this.states.get(id);
        if (!targetState) {
            console.warn(`State ${id} not found`);
            return;
        }

        if (this.currentState === targetState) {
            return;
        }

        if (this.transitionInProgress) {
            console.warn("Transition already in progress");
            return;
        }

        this.transitionInProgress = true;

        if (this.currentState) {
            this.currentState.exit(fadeOutDuration);
        }

        targetState.enter(fadeInDuration);
        const previousState = this.currentState;
        this.currentState = targetState;
        this.currentStateTime = 0;

        this.transitionInProgress = false;

        this.dispatchEvent({
            type: "stateChanged",
            previousState: previousState,
            currentState: this.currentState,
            stateId: id,
            fadeInDuration,
            fadeOutDuration,
        });
    }

    update(delta: number): void {
        if (!this.currentState) return;

        this.mixer.update(delta);
        this.currentStateTime += delta;

        const transitions = this.currentState.getTransitions();
        let transitioned = false;
        for (const transition of transitions) {
            if (this.evaluateTransitionConditions(transition) && this.checkExitTime(transition)) {
                this.setState(transition.targetState.id, transition.fadeInDuration, transition.fadeOutDuration);
                transitioned = true;
                break;
            }
        }

        const anyState = this.states.get("ANY");
        if (!transitioned && anyState && this.currentState !== anyState) {
            for (const transition of anyState.getTransitions()) {
                if (this.evaluateTransitionConditions(transition)) {
                    this.setState(transition.targetState.id, transition.fadeInDuration, transition.fadeOutDuration);
                    transitioned = true;
                    break;
                }
            }
        }

        if (this.currentState instanceof BlendTreeState) {
            const paramNames = this.currentState.getBlendParameters();
            const blendInputs = paramNames.map(name => {
                const param = this.parameters.get(name);
                return typeof param?.value === "number" ? param.value : 0;
            });
            this.currentState.updateBlend(blendInputs);
        }

        for (const param of this.parameters.values()) {
            if (param.type === "trigger") {
                param.value = false;
            }
        }
    }

    addTransition(
        fromState: string,
        toState: string,
        conditions: TransitionCondition[],
        options: Partial<Omit<ITransition, "targetState" | "conditions">> = {},
    ): void {
        const from = this.states.get(fromState);
        const to = this.states.get(toState);

        if (!from || !to) {
            console.warn(`States not found: ${fromState} -> ${toState}`);
            return;
        }

        const transition = {
            targetState: to,
            conditions,
            fadeInDuration: options.fadeInDuration ?? 0.2,
            fadeOutDuration: options.fadeOutDuration ?? 0.2,
            hasExitTime: options.hasExitTime ?? false,
            exitTime: options.exitTime ?? 0,
            fixedDuration: options.fixedDuration ?? false,
            offset: options.offset ?? 0,
            interruptionSource: options.interruptionSource ?? "none",
            orderedInterruption: options.orderedInterruption ?? false,
        };

        from.addTransition(transition);

        this.dispatchEvent({
            type: "transitionAdded",
            fromState: from,
            toState: to,
            transition: transition,
        });
    }

    removeTransition(fromState: string, toState: string): void {
        const from = this.states.get(fromState);
        const to = this.states.get(toState);

        if (!from || !to) {
            console.warn(`States not found: ${fromState} -> ${toState}`);
            return;
        }

        const transitions = from.getTransitions();
        const transitionIndex = transitions.findIndex(t => t.targetState.id === toState);

        if (transitionIndex === -1) {
            console.warn(`Transition not found: ${fromState} -> ${toState}`);
            return;
        }

        const removedTransition = transitions[transitionIndex];

        const newTransitions = transitions.filter((_, index) => index !== transitionIndex);
        from.clearTransitions();
        newTransitions.forEach(t => from.addTransition(t));

        this.dispatchEvent({
            type: "transitionRemoved",
            fromState: from,
            toState: to,
            transition: removedTransition,
        } as AnimationGraphEvents["transitionRemoved"]);
    }

    removeSpecificTransition(fromState: string, toState: string, transitionIndex: number): void {
        const from = this.states.get(fromState);
        const to = this.states.get(toState);

        if (!from || !to) {
            console.warn(`States not found: ${fromState} -> ${toState}`);
            return;
        }

        const transitions = from.getTransitions();
        const transitionsToTarget = transitions.filter(t => t.targetState.id === toState);

        if (transitionIndex >= transitionsToTarget.length) {
            console.warn(`Transition index ${transitionIndex} not found for ${fromState} -> ${toState}`);
            return;
        }

        let actualIndex = -1;
        let targetTransitionIndex = 0;
        for (let i = 0; i < transitions.length; i++) {
            if (transitions[i]!.targetState.id === toState) {
                if (targetTransitionIndex === transitionIndex) {
                    actualIndex = i;
                    break;
                }
                targetTransitionIndex++;
            }
        }

        if (actualIndex === -1) {
            console.warn(`Transition index ${transitionIndex} not found for ${fromState} -> ${toState}`);
            return;
        }

        const removedTransition = from.removeTransition(actualIndex);

        if (removedTransition) {
            this.dispatchEvent({
                type: "transitionRemoved",
                fromState: from,
                toState: to,
                transition: removedTransition,
            });
        }
    }

    addState(state?: IAnimationState): void {
        if (!state) {
            return;
        }
        const existing = this.states.get(state.id);
        if (existing) {
            existing.dispose();
        }
        this.states.set(state.id, state);
        state.initialize(this.mixer);
        this.dispatchEvent({
            type: "stateAdded",
            state: state,
        });
    }

    removeState(stateId: string): void {
        const state = this.states.get(stateId);
        if (!state) {
            console.warn(`State ${stateId} not found`);
            return;
        }

        // Prevent removing core states: 'ANY' and 'Idle'
        const isAnyCore = stateId === "ANY" || state.name === "ANY";
        const isIdleCore = stateId === "Idle" || state.name === "Idle";
        if (isAnyCore || isIdleCore) {
             
            console.warn(`Cannot remove core state '${state.name}'`);
            return;
        }

        if (this.currentState === state) {
            this.currentState = null;
        }

        this.states.forEach(s => {
            const transitions = s.getTransitions();
            const transitionsToRemove = transitions.filter(t => t.targetState.id === stateId);
            transitionsToRemove.forEach(t => {
                this.removeTransition(s.id, stateId);
            });
        });

        this.states.delete(stateId);

        state.dispose();

        this.dispatchEvent({
            type: "stateRemoved",
            state: state,
            stateId: stateId,
        });
    }

    setParameter(name: string, value: number | boolean): void {
        const parameter = this.parameters.get(name);
        if (!parameter) {
            console.warn(`Parameter ${name} not found`);
            return;
        }

        const oldValue = parameter.value;
        parameter.value = value;

        this.dispatchEvent({
            type: "parameterChanged",
            parameter: parameter,
            oldValue: oldValue,
            newValue: value,
        });
    }

    getParameter(name: string): AnimationParameter | undefined {
        return this.parameters.get(name);
    }

    addParameter(name: string, type: ParameterType, defaultValue?: number | boolean): void {
        // Normalize undefined defaults based on type: numbers -> 0, booleans/triggers -> false
        let normalizedDefault: number | boolean;
        if (type === "float" || type === "int") {
            const num = typeof defaultValue === "number" ? defaultValue : 0;
            normalizedDefault = type === "int" ? Math.trunc(num) : num;
        } else {
            // bool or trigger
            normalizedDefault = typeof defaultValue === "boolean" ? defaultValue : false;
        }

        const parameter = {
            name,
            type,
            value: normalizedDefault,
            defaultValue: normalizedDefault,
        };
        this.parameters.set(name, parameter);

        this.dispatchEvent({
            type: "parameterAdded",
            parameter: parameter,
        });
    }

    removeParameter(name: string): void {
        const parameter = this.parameters.get(name);
        if (!parameter) {
            console.warn(`Parameter ${name} not found`);
            return;
        }

        let isUsed = false;
        this.states.forEach(state => {
            const transitions = state.getTransitions();
            transitions.forEach(transition => {
                transition.conditions.forEach(condition => {
                    if (condition.parameter === name) {
                        isUsed = true;
                    }
                });
            });
        });

        if (isUsed) {
            console.warn(`Cannot remove parameter ${name} - it is used in transitions`);
            return;
        }

        this.parameters.delete(name);

        this.dispatchEvent({
            type: "parameterRemoved",
            parameterName: name,
        });
    }

    getMixer(): AnimationMixer {
        return this.mixer;
    }

    getState(id: string): IAnimationState | undefined {
        return this.states.get(id);
    }

    getStates(): IAnimationState[] {
        return Array.from(this.states.values());
    }

    getParameters(): Map<string, AnimationParameter> {
        return this.parameters;
    }

    reorderParameters(sourceIndex: number, destinationIndex: number): void {
        const entries = Array.from(this.parameters.entries());
        if (
            sourceIndex < 0 ||
            sourceIndex >= entries.length ||
            destinationIndex < 0 ||
            destinationIndex >= entries.length ||
            sourceIndex === destinationIndex
        ) {
            return;
        }
        const moved = entries.splice(sourceIndex, 1)[0] as [string, AnimationParameter];
        entries.splice(destinationIndex, 0, moved);

        // Rebuild Map to reflect new order
        this.parameters = new Map(entries);
        // No specific event today; consumers reading getParameters().values() will get new order
    }

    getCurrentState(): IAnimationState | null {
        return this.currentState;
    }

    toJSON(): string {
        const serialized: SerializedGraph = {
            currentState: this.currentState?.id || "",
            parameters: Array.from(this.parameters.values()),
            states: Array.from(this.states.values()).map(state => (state as any).toJSON()),
        };
        return JSON.stringify(serialized, null, 2);
    }

    fromJSON(data: string, clipMap: Record<string, AnimationClip>): void {
        const serialized: SerializedGraph = JSON.parse(data);
        this.states.clear();
        this.currentState = null;
        this.parameters.clear();

        for (const param of serialized.parameters) {
            this.addParameter(param.name, param.type, param.defaultValue);
        }

        for (const stateData of serialized.states) {
            let state: IAnimationState;
            if (stateData.blendTree) {
                state = (BlendTreeState as any).fromJSON(stateData, clipMap, this.mixer);
            } else {
                state = (AnimationState as any).fromJSON(stateData, clipMap, this.mixer);
            }
            this.addState(state);
        }

        for (const stateData of serialized.states) {
            const state = this.states.get(stateData.id);
            if (!state) continue;
            for (const transitionData of stateData.transitions) {
                const targetState = this.states.get(transitionData.toState);
                if (!targetState) continue;
                state.addTransition({
                    targetState,
                    conditions: transitionData.conditions,
                    fadeInDuration: transitionData.fadeInDuration,
                    fadeOutDuration: transitionData.fadeOutDuration,
                    hasExitTime: transitionData.hasExitTime,
                    exitTime: transitionData.exitTime,
                    fixedDuration: transitionData.fixedDuration,
                    offset: transitionData.offset,
                    interruptionSource: transitionData.interruptionSource,
                    orderedInterruption: transitionData.orderedInterruption,
                });
            }
        }

        this.ensureCoreStates();
        const idleKey = this.findIdleKey();
        if (idleKey) {
            this.setState(idleKey);
        }
    }

    reset(): void {
        let defaultState = this.states.get("Idle");
        if (!defaultState) {
            defaultState = Array.from(this.states.values()).find(s => s.name !== "ANY");
        }
        if (defaultState) {
            this.setState(defaultState.id);
        }

        for (const state of this.states.values()) {
            state.resetToRestPose();
        }
    }

    private evaluateTransitionConditions(transition: ITransition): boolean {
        return transition.conditions.every(condition => {
            const parameter = this.parameters.get(condition.parameter);
            if (!parameter) return false;

            switch (condition.operator) {
                case "equals":
                    return parameter.value === condition.value;
                case "notEquals":
                    return parameter.value !== condition.value;
                case "greater":
                    return parameter.value > condition.value;
                case "less":
                    return parameter.value < condition.value;
                case "greaterOrEqual":
                    return parameter.value >= condition.value;
                case "lessOrEqual":
                    return parameter.value <= condition.value;
                default:
                    return false;
            }
        });
    }

    private checkExitTime(transition: ITransition): boolean {
        if (!transition.hasExitTime) return true;
        return this.currentStateTime >= transition.exitTime;
    }

    private ensureCoreStates(): void {
        if (!this.states.has("ANY")) {
            const anyState = new AnimationState("ANY", "ANY");
            this.addState(anyState);
        }
        const hasIdle = Array.from(this.states.keys()).some(k => k.toLowerCase() === "idle");
        if (!hasIdle) {
            const idleState = new AnimationState("Idle", "Idle");
            idleState.setPosition(0, 100);
            this.addState(idleState);
        }
    }
    private findIdleKey(): string | null {
        for (const key of this.states.keys()) {
            if (key.toLowerCase() === "idle") return key;
        }
        return null;
    }
}
