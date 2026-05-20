
import EventEmitter from "eventemitter3";

/**
 *
 * @param type
 */
function shouldTraceAppEvent(type) {
    const trace = globalThis?.__TRACE_APP_EVENTS__;
    if (!trace) {
        return false;
    }
    if (trace === true) {
        return true;
    }
    if (Array.isArray(trace)) {
        return trace.includes(type);
    }
    if (typeof trace === "string") {
        return trace.split(",").map(s => s.trim()).includes(type);
    }
    return false;
}

/**
 *
 * @param typenames
 */
function parseTypenames(typenames) {
    return typenames.trim().split(/\s+/).map(name => {
        const index = name.indexOf(".");
        return {
            type: index === -1 ? name : name.slice(0, index),
            namespace: index === -1 ? "" : name.slice(index + 1),
        };
    });
}

class DispatchCompat {
    constructor(...types) {
        this.types = new Set(types);
        this.emitter = new EventEmitter();
        this.listeners = new Map();
    }

    on(typenames, callback) {
        const names = parseTypenames(typenames);

        if (arguments.length < 2 && names.length > 0) {
            const {type, namespace} = names[0];
            this.ensureType(type);
            return this.listeners.get(`${type}.${namespace}`)?.callback;
        }

        names.forEach(({type, namespace}) => {
            this.ensureType(type);
            const key = `${type}.${namespace}`;
            const existing = this.listeners.get(key);

            if (existing) {
                this.emitter.off(type, existing.handler);
                this.listeners.delete(key);
            }

            if (callback === null || callback === undefined) {
                if (shouldTraceAppEvent(type)) {
                    console.info(`[DispatchCompat] off ${key}`);
                }
                return;
            }

            const handler = (ctx, ...args) => callback.call(ctx, ...args);
            this.listeners.set(key, {callback, handler});
            this.emitter.on(type, handler);
            if (shouldTraceAppEvent(type)) {
                console.info(`[DispatchCompat] on ${key} (listeners=${this.emitter.listenerCount(type)})`);
            }
        });

        return this;
    }

    off(typenames) {
        return this.on(typenames, null);
    }

    call(type, that, ...args) {
        this.ensureType(type);
        if (shouldTraceAppEvent(type)) {
            console.info(`[DispatchCompat] emit ${type} (listeners=${this.emitter.listenerCount(type)})`, args);
        }
        this.emitter.emit(type, that, ...args);
    }

    apply(type, that, args) {
        const values = Array.isArray(args) ? args : [];
        this.call(type, that, ...values);
    }

    ensureType(type) {
        if (!this.types.has(type)) {
            throw new Error(`unknown type: ${type}`);
        }
    }
}

/**
 *
 * @param {...any} types
 */
export function dispatch(...types) {
    return new DispatchCompat(...types);
}
