
/**
 * Module: ScriptChangedEvent.js
 * Purpose: Contains logic for script changed event.
 */


import BaseEvent from "./BaseEvent";
import global from "../global";

class ScriptChangedEvent extends BaseEvent {
    constructor() {
        super();
        this.handleChange = this.handleChange.bind(this);
    }

    start() {
        global.app.on(`scriptChanged.${this.id}`, this.handleChange);
    }

    stop() {
        global.app.on(`scriptChanged.${this.id}`, null);
    }

    reset() {}

    handleChange() {
        global.app.call("send", this, {
            type: "changeScript",
            scripts: global.app.scripts,
        });
    }
}

export default ScriptChangedEvent;
