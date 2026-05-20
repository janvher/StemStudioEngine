import type {FC, ReactNode} from "react";
import {createContext, useContext, useState, useEffect, useCallback} from "react";

import EngineRuntime from "../EngineRuntime";
import global from "../global";

interface FTUEContextType {
    isFTUEVisible: boolean;
    showFTUE: () => void;
    hideFTUE: () => void;
    currentStep: number;
    setCurrentStep: (step: number) => void;
}

const FTUEContext = createContext<FTUEContextType | undefined>(undefined);

export const FTUEProvider: FC<{children: ReactNode}> = ({children}) => {
    const [isFTUEVisible, setIsFTUEVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const app = global.app as EngineRuntime;
    const userId = app?.userId;
    const searchParams = window.location.search;

    useEffect(() => {
        if (!userId) return;
        const params = new URLSearchParams(searchParams);
        const finishedUsers = JSON.parse(localStorage.getItem("finishedFTUEUsers") || "[]");
        const isFinished = finishedUsers.includes(userId);

        setIsFTUEVisible(!isFinished && params.get("ftue") === "true");
    }, [userId, searchParams]);

    const showFTUE = useCallback(() => {
        if (!userId) return;

        const finishedUsers = JSON.parse(localStorage.getItem("finishedFTUEUsers") || "[]");
        const updatedUsers = finishedUsers.filter((id: string) => id !== userId);
        localStorage.setItem("finishedFTUEUsers", JSON.stringify(updatedUsers));
        setIsFTUEVisible(true);
        setCurrentStep(0);
    }, [userId]);

    const hideFTUE = useCallback(() => {
        setIsFTUEVisible(false);
        const params = new URLSearchParams(window.location.search);
        params.delete("ftue");
        const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
        window.history.pushState({}, "", newUrl);
    }, [userId, window.location.pathname, window.location.search]);

    return (
        <FTUEContext.Provider
            value={{
                isFTUEVisible,
                showFTUE,
                hideFTUE,
                currentStep,
                setCurrentStep,
            }}
        >
            {children}
        </FTUEContext.Provider>
    );
};

export const useFTUE = () => {
    const context = useContext(FTUEContext);
    if (context === undefined) {
        throw new Error("useFTUE must be used within an FTUEProvider");
    }
    return context;
};
