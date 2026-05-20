// Context available inside Comlink worker methods
export interface WorkerContext {
    state: Record<string, unknown>;
    running: boolean;
    postToMain(type: string, data?: unknown): void;
    yield(): Promise<void>;
    hasMessages(): boolean;
    nextMessage(): { type: string; data: unknown } | undefined;
}

// Contract for behavior workers exposed via Comlink
export interface BehaviorWorkerAPI {
    init(initData: unknown): void | Promise<void>;
    start(): Promise<void>;
    stop(): void;
    sendMessage(type: string, data: unknown): void;
    dispose(): void;
    setOnPostToMain(callback: (type: string, data: unknown) => void): void;
}
