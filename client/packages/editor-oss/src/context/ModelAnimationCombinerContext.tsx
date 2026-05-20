import React, { useState, createContext, ReactNode } from "react";
import { Edge, Node } from "reactflow";

import { IAnimationGraph } from "../animation/types";

export interface Animation {
    uuid: string;
    name: string;
    duration: string;
    [key: string]: any; // Placeholder for other properties
}

interface State {
    mainModel: any;
    animations: Animation[];
    mixer: any;
    loading: boolean;
    animationGraph: IAnimationGraph | null;
}

const initialState: State = {
    mainModel: null,
    animations: [],
    mixer: null,
    loading: false,
    animationGraph: null,
};

interface ContextProps extends State {
    addMainModel: (object: any) => void;
    addAnimationFromMainModel: (animations: Animation[]) => void;
    addAnimations: (animations: Animation[]) => void;
    changeName: (animation: Animation) => void;
    addMixer: (mixer: any) => void;
    deleteAnimation: (animationId: string) => void;
    toggleLoading: () => void;
    clearState: () => void;
    setAction: (action: any) => void;
    action: any;
    setAnimationGraph: (graph: IAnimationGraph | null) => void;
    uploadOptionSelected: boolean
    setUploadOptionSelected: React.Dispatch<React.SetStateAction<boolean>>
    selectedNode: Node | null
    setSelectedNode: React.Dispatch<React.SetStateAction<Node | null>>
    selectedEdge: Edge | null
    setSelectedEdge: React.Dispatch<React.SetStateAction<Edge | null>>
}

export const ModelAnimationCombinerContext = createContext<ContextProps>(initialState as ContextProps);

export const ModelAnimationCombinerContextProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<State>(initialState);
    const [action, setAction] = useState<any>(null);
    const [uploadOptionSelected, setUploadOptionSelected] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

    const addMainModel = (object: any) => {
        setState(prevState => ({ ...prevState, mainModel: object }));
    };

    const addAnimationFromMainModel = (animations: Animation[]) => {
        setState(prevState => ({ ...prevState, animations: [...animations] }));
    };

    const addAnimations = (animations: Animation[]) => {
        setState(prevState => ({
            ...prevState,
            animations: [...prevState.animations, ...animations],
        }));
    };

    const changeName = (animation: Animation) => {
        setState(prevState => ({
            ...prevState,
            animations: prevState.animations.map(anim => anim.uuid === animation.uuid ? animation : anim),
        }));
    };

    const addMixer = (mixer: any) => {
        setState(prevState => ({ ...prevState, mixer }));
    };

    const deleteAnimation = (animationId: string) => {
        setState(prevState => ({
            ...prevState,
            animations: prevState.animations.filter(animation => animation.uuid !== animationId),
        }));
    };

    const toggleLoading = () => {
        setState(prevState => ({ ...prevState, loading: !prevState.loading }));
    };

    const clearState = () => {
        setState(initialState);
    };

    const setAnimationGraph = (graph: IAnimationGraph | null) => {
        setState(prevState => ({ ...prevState, animationGraph: graph }));
    };

    return (
        <ModelAnimationCombinerContext.Provider
            value={{
                ...state,
                addMainModel,
                addAnimationFromMainModel,
                addAnimations,
                changeName,
                addMixer,
                deleteAnimation,
                toggleLoading,
                clearState,
                setAction,
                action,
                setAnimationGraph,
                uploadOptionSelected,
                setUploadOptionSelected,
                selectedEdge,
                setSelectedEdge,
                selectedNode,
                setSelectedNode,
            }}
        >
            {children}
        </ModelAnimationCombinerContext.Provider>
    );
};

export default ModelAnimationCombinerContextProvider;
