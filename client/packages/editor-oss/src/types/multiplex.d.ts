declare module "multiplex" {
    import type {Buffer} from "buffer";

    type EventHandler = (...args: unknown[]) => void;

    export interface MultiplexChannel {
        write(chunk: Buffer | Uint8Array | string): void;
        end(): void;
        destroy(): void;
        on(event: "data", handler: (chunk: Buffer) => void): this;
        on(event: "error", handler: (error: Error) => void): this;
        on(event: "end", handler: () => void): this;
        on(event: string, handler: EventHandler): this;
    }

    export interface MultiplexStream {
        write(chunk: Buffer | Uint8Array): void;
        destroy(): void;
        createSharedStream(name: string): MultiplexChannel;
        on(event: "data", handler: (chunk: Buffer) => void): this;
        on(event: "error", handler: (error: Error) => void): this;
        on(event: string, handler: EventHandler): this;
    }

    export default function multiplex(): MultiplexStream;
}
