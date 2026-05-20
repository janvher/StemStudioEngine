declare module 'multiplex' {
    import { Duplex } from 'node:stream';

    interface Multiplex extends Duplex {
        createSharedStream(name: string): Duplex;
        destroy(): void;
    }

    function multiplex(opts?: any): Multiplex;

    export = multiplex;
}
