import React, {useEffect, useMemo, useState} from "react";
import * as THREE from "three";

import global from "../global";
import {ILightState} from "../types/editor";

interface LightingContextValue {
    setColorChangeActivated: React.Dispatch<React.SetStateAction<boolean>>;
    setSkyColorChangeActivated: React.Dispatch<React.SetStateAction<boolean>>;
    setGroundColorChangeActivated: React.Dispatch<React.SetStateAction<boolean>>;
    colorChangeActivated: boolean;
    skyColorChangeActivated: boolean;
    groundColorChangeActivated: boolean;
    lightState: ILightState;
    setLightState: React.Dispatch<React.SetStateAction<ILightState>>;
}

export const LightingContext = React.createContext<LightingContextValue>(null!);

export interface LightingContextProviderProps {
    children: React.ReactNode;
}

const LightingContextProvider: React.FC<LightingContextProviderProps> = ({children}) => {
    const [colorChangeActivated, setColorChangeActivated] = useState(false);
    const [skyColorChangeActivated, setSkyColorChangeActivated] = useState(false);
    const [groundColorChangeActivated, setGroundColorChangeActivated] = useState(false);
    const [lightState, setLightState] = useState<ILightState>({
        label: "",
        show: false,
        showShadowParams: false,
        shadowMapSize: 512,
        shadowBias: 0.001,
        shadowRadius: 1,
    });
    const app = global.app;
    const editor = app?.editor;

    useEffect(() => {
        if (!editor?.selected || !(editor.selected instanceof THREE.Light)) {
            setLightState(prevState => ({
                ...prevState,
                show: false,
            }));
            return;
        } else {
            setLightState(prevState => ({
                ...prevState,
                show: true,
            }));
        }
    }, [editor, editor?.selected]);

    const contextValue = useMemo<LightingContextValue>(
        () => ({
            setColorChangeActivated,
            colorChangeActivated,
            setSkyColorChangeActivated,
            skyColorChangeActivated,
            setGroundColorChangeActivated,
            groundColorChangeActivated,
            lightState,
            setLightState,
        }),
        [colorChangeActivated, skyColorChangeActivated, groundColorChangeActivated, lightState],
    );

    return <LightingContext.Provider value={contextValue}>{children}</LightingContext.Provider>;
};

export default LightingContextProvider;
