import {createContext, useContext, type ReactNode} from "react";

import {EmptyCopilotProvider} from "./EmptyCopilotProvider";
import type {CopilotProvider} from "./types";

/**
 * React context that exposes the active CopilotProvider to the editor.
 * If no provider is supplied, consumers receive an EmptyCopilotProvider
 * so the UI still renders.
 */
export const CopilotContext = createContext<CopilotProvider>(new EmptyCopilotProvider());

export interface CopilotContextProviderProps {
    provider: CopilotProvider;
    children: ReactNode;
}

export const CopilotContextProvider = ({provider, children}: CopilotContextProviderProps) => {
    return <CopilotContext.Provider value={provider}>{children}</CopilotContext.Provider>;
};

export const useCopilot = (): CopilotProvider => useContext(CopilotContext);
