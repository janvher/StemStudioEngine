export interface ConsoleMessage {
    type: "log" | "warn" | "error" | "info";
    args: unknown[];
    timestamp: number;
}

type MessageCallback = (msg: ConsoleMessage) => void;

const MAX_MESSAGES = 1000;

const INTERCEPT_METHODS = ["log", "warn", "error", "info"] as const;

export class ConsoleInterceptor {
    private originals = new Map<string, (...args: unknown[]) => void>();
    private active = false;

    start(onMessage: MessageCallback): void {
        if (this.active) return;
        this.active = true;

        for (const method of INTERCEPT_METHODS) {
            const original = console[method].bind(console);
            this.originals.set(method, original);

            console[method] = (...args: unknown[]) => {
                original(...args);
                onMessage({type: method, args, timestamp: Date.now()});
            };
        }
    }

    stop(): void {
        if (!this.active) return;
        this.active = false;

        for (const method of INTERCEPT_METHODS) {
            const original = this.originals.get(method);
            if (original) {
                console[method] = original;
            }
        }
        this.originals.clear();
    }
}

export const consoleInterceptor = new ConsoleInterceptor();
export {MAX_MESSAGES};
