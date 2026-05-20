import type {ConsoleMessage} from "./ConsoleInterceptor";
import {MAX_MESSAGES} from "./ConsoleInterceptor";
import global from "@stem/editor-oss/global";
import {breakpointManager} from "../BehaviorEditor/breakpoints";

export interface ScriptFile {
    fileId: string;
    fileName: string;
    type: "behavior" | "lambda";
    sourceCode: string;
    hasBreakpoints: boolean;
    breakpointLines: number[];
}

export interface DebugSession {
    sessionId: string;
    startTime: number;
    scripts: ScriptFile[];
    consoleMessages: ConsoleMessage[];
}

export type DebugSessionListener = (session: DebugSession | null) => void;

class DebugSessionManager {
    private session: DebugSession | null = null;
    private listeners = new Set<DebugSessionListener>();

    shouldAutoLaunch(): boolean {
        const productionMode = global.app?.editor?.scene?.userData?.productionMode;
        const hasBreakpoints = breakpointManager.getTotalCount() > 0;
        console.info("[DebugSessionManager] shouldAutoLaunch:", {hasBreakpoints, productionMode});
        return hasBreakpoints && !productionMode;
    }

    startSession(): void {
        const game = global.app?.game;
        console.info("[DebugSessionManager] startSession — game:", !!game,
            "behaviorScripts:", Object.keys(game?.behaviorScripts ?? {}).length,
            "lambdaScripts:", Object.keys(game?.lambdaScripts ?? {}).length);
        const scripts: ScriptFile[] = [];

        // Gather all behavior scripts from GameManager cache
        const behaviorScripts = game?.behaviorScripts ?? {};
        const behaviorNames = game?.behaviorNames ?? {};
        for (const [id, code] of Object.entries(behaviorScripts)) {
            const fileId = `${id}-code`;
            const bps = breakpointManager.get(fileId);
            scripts.push({
                fileId,
                fileName: behaviorNames[id] || id,
                type: "behavior",
                sourceCode: code,
                hasBreakpoints: bps.size > 0,
                breakpointLines: Array.from(bps).sort((a, b) => a - b),
            });
        }

        // Gather all lambda scripts from GameManager cache
        const lambdaScripts = game?.lambdaScripts ?? {};
        for (const [id, code] of Object.entries(lambdaScripts)) {
            const fileId = `lambda-code-${id}`;
            const bps = breakpointManager.get(fileId);
            scripts.push({
                fileId,
                fileName: id,
                type: "lambda",
                sourceCode: code,
                hasBreakpoints: bps.size > 0,
                breakpointLines: Array.from(bps).sort((a, b) => a - b),
            });
        }

        this.session = {
            sessionId: `dbg-${Date.now()}`,
            startTime: Date.now(),
            scripts,
            consoleMessages: [],
        };
        this.notify();
    }

    endSession(): void {
        this.session = null;
        this.notify();
    }

    getSession(): DebugSession | null {
        return this.session;
    }

    addConsoleMessage(msg: ConsoleMessage): void {
        if (!this.session) return;
        this.session.consoleMessages.push(msg);
        if (this.session.consoleMessages.length > MAX_MESSAGES) {
            this.session.consoleMessages.shift();
        }
        this.notify();
    }

    subscribe(listener: DebugSessionListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        const snapshot = this.session;
        this.listeners.forEach(fn => {
            try { fn(snapshot); } catch (e) { console.error("[DebugSessionManager] listener error:", e); }
        });
    }
}

export const debugSessionManager = new DebugSessionManager();
