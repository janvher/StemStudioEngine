import {AnimationClip, AnimationMixer, AnimationAction, EventDispatcher} from "three";

export type ParameterType = "float" | "int" | "bool" | "trigger";

export interface AnimationParameter {
    name: string;
    type: ParameterType;
    value: number | boolean;
    defaultValue: number | boolean;
}

// Event types for AnimationGraph
export interface AnimationGraphEvents {
    stateChanged: {
        type: "stateChanged";
        previousState: IAnimationState | null;
        currentState: IAnimationState;
        stateId: string;
        fadeInDuration: number;
        fadeOutDuration: number;
    };
    stateAdded: {
        type: "stateAdded";
        state: IAnimationState;
    };
    stateRemoved: {
        type: "stateRemoved";
        state: IAnimationState;
        stateId: string;
    };
    transitionAdded: {
        type: "transitionAdded";
        fromState: IAnimationState;
        toState: IAnimationState;
        transition: ITransition;
    };
    transitionRemoved: {
        type: "transitionRemoved";
        fromState: IAnimationState;
        toState: IAnimationState;
        transition: ITransition;
    };
    parameterAdded: {
        type: "parameterAdded";
        parameter: AnimationParameter;
    };
    parameterRemoved: {
        type: "parameterRemoved";
        parameterName: string;
    };
    parameterChanged: {
        type: "parameterChanged";
        parameter: AnimationParameter;
        oldValue: number | boolean;
        newValue: number | boolean;
    };
}

// Strict payload type for animation states
export interface AnimationStatePayload {
    loop?: boolean;
    clampWhenFinished?: boolean;
    timeScale?: number;
    weight?: number;
    clip?: AnimationClip;
    duration?: number;
    // Add more fields as needed
}

export interface IAnimationState {
    id: string;
    name: string;
    payload: AnimationStatePayload;
    initialize(mixer: AnimationMixer): void;
    enter(fadeInDuration?: number): void;
    exit(fadeOutDuration?: number): void;
    addTransition(transition: ITransition): void;
    getTransitions(): ITransition[];
    clearTransitions(): void;
    removeTransition(index: number): ITransition | null;
    isStateActive(): boolean;
    getAction(): AnimationAction | null;
    setPosition(x: number, y: number): void;
    getPosition(): {x: number; y: number} | null;
    dispose(): void;
    resetToRestPose(): void;
}

export interface TransitionCondition {
    parameter: string;
    operator: "equals" | "notEquals" | "greater" | "less" | "greaterOrEqual" | "lessOrEqual";
    value: number | boolean;
}

export interface ITransition {
    targetState: IAnimationState;
    conditions: TransitionCondition[];
    fadeInDuration: number;
    fadeOutDuration: number;
    hasExitTime: boolean;
    exitTime: number;
    fixedDuration: boolean;
    offset: number;
    interruptionSource: "none" | "current" | "next" | "both";
    orderedInterruption: boolean;
}

export interface IBlendTreeState extends IAnimationState {
    updateBlend(inputs: number[]): void;
    getActions(): AnimationAction[];
    resetToRestPose(): void;
}

export interface IAnimationGraph extends EventDispatcher<AnimationGraphEvents> {
    setState(id: string, fadeInDuration?: number, fadeOutDuration?: number): void;
    update(delta: number, inputs?: Record<string, any>): void;
    addTransition(
        fromState: string,
        toState: string,
        conditions: TransitionCondition[],
        options?: Partial<Omit<ITransition, "targetState" | "conditions">>,
    ): void;
    removeTransition(fromState: string, toState: string): void;
    removeSpecificTransition(fromState: string, toState: string, transitionIndex: number): void;
    setParameter(name: string, value: number | boolean): void;
    getParameter(name: string): AnimationParameter | undefined;
    addParameter(name: string, type: ParameterType, defaultValue?: number | boolean): void;
    removeParameter(name: string): void;
    toJSON(): string;
    fromJSON(data: string, clipMap: Record<string, AnimationClip>): void;
    getMixer(): AnimationMixer;
    getState(id: string): IAnimationState | undefined;
    getStates(): IAnimationState[];
    getParameters(): Map<string, AnimationParameter>;
    /**
     * Reorder parameters by moving the entry at sourceIndex to destinationIndex.
     */
    reorderParameters(sourceIndex: number, destinationIndex: number): void;
    addState(state: IAnimationState): void;
    removeState(stateId: string): void;
    getCurrentState: () => any;
}

export interface BlendTreeConfig {
    clips: AnimationClip[];
    positions: number[][];
    parameters: string[]; // Names of graph parameters used for blending, in order
}

export interface SerializedState {
    id: string;
    name: string;
    payload: AnimationStatePayload;
    transitions: {
        toState: string;
        conditions: TransitionCondition[];
        fadeInDuration: number;
        fadeOutDuration: number;
        hasExitTime: boolean;
        exitTime: number;
        fixedDuration: boolean;
        offset: number;
        interruptionSource: "none" | "current" | "next" | "both";
        orderedInterruption: boolean;
    }[];
    blendTree?: BlendTreeConfig;
}

export interface SerializedGraph {
    currentState: string;
    parameters: AnimationParameter[];
    states: SerializedState[];
}
