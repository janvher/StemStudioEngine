import { StemEvents } from "./StemEvents";
import EventBus from "../../event/EventBus";

/**
 * Engine-side factory for `this.erth.events`. Behavior code calls
 * `this.erth.events.on(topic, cb)` and gets back an idempotent teardown
 * function. The wrapper holds the `EventBus` reference so behavior code
 * never imports / references `EventBus` directly. See
 * `docs/planning/2026-05-06-erth-events-api.md` for the rationale.
 */
export const createEventsInterface = (): StemEvents => ({
    on(topic, callback) {
        const token = EventBus.instance.subscribe(topic, callback);
        let detached = false;
        return () => {
            if (detached) return;
            detached = true;
            EventBus.instance.unsubscribe(token);
        };
    },
});
