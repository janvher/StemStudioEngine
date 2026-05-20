// Context available inside Comlink worker methods
export interface WorkerContext {
    state: Record<string, any>;
    running: boolean;
    postToMain(type: string, data?: any): void;
    yield(): Promise<void>;
    hasMessages(): boolean;
    nextMessage(): { type: string; data: any } | undefined;
}

// Contract for behavior workers exposed via Comlink
export interface BehaviorWorkerAPI {
    init(initData: any): void | Promise<void>;
    start(): Promise<void>;
    stop(): void;
    sendMessage(type: string, data: any): void;
    dispose(): void;
    setOnPostToMain(callback: (type: string, data: any) => void): void;
}
